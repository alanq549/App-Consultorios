/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/request-affiliation.use-case.ts
/// Caso de uso: Solicitar afiliación a un consultorio/tenant (Apply).
///
/// Propósito: Permite que un profesional autenticado solicite afiliación en un tenant específico,
/// registrando de forma atómica:
/// 1. La entidad de afiliación en estado PENDING_REVIEW.
/// 2. La propuesta de contenido inicial (revisión #1) en PENDING_REVIEW con sus redes sociales.
/// 3. El evento de auditoría inmutable con acción APPLY.

import { Prisma } from "@prisma/client";
import type { AffiliationContent } from "../../domain/affiliation-types";
import {
  AffiliationAlreadyExistsError,
  DuplicateSocialLinkTypeError,
  ProfessionalProfileNotFoundError,
  TenantNotActiveError,
} from "../../domain/affiliation-errors";
import type { ProfessionalProfileOwnerChecker } from "../ports/professional-profile-owner-checker";
import type {
  AffiliationRecord,
} from "../ports/affiliation-repository";
import type {
  AffiliationRevisionRecord,
} from "../ports/affiliation-revision-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface RequestAffiliationInput {
  tenantId: number;
  actorUserId: number;
  content: AffiliationContent;
}

export interface RequestAffiliationOutput {
  affiliation: AffiliationRecord;
  revision: AffiliationRevisionRecord;
}

export class RequestAffiliationUseCase {
  constructor(
    private readonly profileOwnerChecker: ProfessionalProfileOwnerChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  /**
   * Ejecuta la solicitud de afiliación.
   *
   * @param input - Datos de la solicitud (tenantId, actorUserId y contenido inicial).
   * @returns La afiliación y la revisión creadas.
   *
   * @throws {ProfessionalProfileNotFoundError} Si el usuario autenticado no posee un perfil profesional.
   * @throws {TenantNotActiveError} Si el tenant no existe o no está activo.
   * @throws {DuplicateSocialLinkTypeError} Si el contenido incluye enlaces duplicados para la misma red social.
   * @throws {AffiliationAlreadyExistsError} Si ya existe una afiliación para ese perfil en el tenant.
   */
  async execute(
    input: RequestAffiliationInput,
  ): Promise<RequestAffiliationOutput> {
    // 1. Resuelve la identidad y pertenencia del perfil profesional del actor.
    const professionalProfileId =
      await this.profileOwnerChecker.getProfileIdByUserId(input.actorUserId);

    if (!professionalProfileId) {
      throw new ProfessionalProfileNotFoundError(input.actorUserId);
    }

    // 2. Valida que no haya enlaces sociales duplicados por tipo.
    if (input.content.socialLinks && input.content.socialLinks.length > 0) {
      const seenTypes = new Set<string>();
      for (const link of input.content.socialLinks) {
        if (seenTypes.has(link.type)) {
          throw new DuplicateSocialLinkTypeError(link.type);
        }
        seenTypes.add(link.type);
      }
    }

    try {
      // 3. Ejecuta la creación atómica dentro de la unidad de trabajo (Unit of Work).
      return await this.unitOfWork.execute(async (repos) => {
        // 3.1 Valida que el tenant exista y esté en estado ACTIVE.
        const isTenantActive = await repos.tenants.isActiveTenant(input.tenantId);
        if (!isTenantActive) {
          throw new TenantNotActiveError(input.tenantId);
        }

        // 3.2 Verifica duplicados antes de insertar.
        const existing =
          await repos.affiliations.findByProfessionalProfileAndTenant(
            professionalProfileId,
            input.tenantId,
          );

        if (existing) {
          throw new AffiliationAlreadyExistsError(
            professionalProfileId,
            input.tenantId,
            existing.status,
          );
        }

        // 3.3 Crea la afiliación en estado inicial PENDING_REVIEW.
        const affiliation = await repos.affiliations.create({
          professionalProfileId,
          tenantId: input.tenantId,
          status: "PENDING_REVIEW",
        });

        // 3.4 Crea la primera revisión (versión 1) en PENDING_REVIEW junto a sus redes sociales.
        const revision = await repos.revisions.create({
          tenantId: input.tenantId,
          affiliationId: affiliation.id,
          revisionNumber: 1,
          description: input.content.description,
          submittedByUserId: input.actorUserId,
          socialLinks: input.content.socialLinks,
        });

        // 3.5 Registra el evento de auditoría inicial (APPLY).
        await repos.audit.append({
          tenantId: input.tenantId,
          affiliationId: affiliation.id,
          revisionId: revision.id,
          action: "APPLY",
          actorUserId: input.actorUserId,
          previousStatus: null,
          nextStatus: "PENDING_REVIEW",
          occurredAt: new Date(),
        });

        return { affiliation, revision };
      });
    } catch (error: unknown) {
      // Manejo estricto de condición de carrera si dos peticiones concurrentes superan el findBy... simultáneamente
      // y la restricción UNIQUE(professionalProfileId, tenantId) salta en la base de datos.
      // Se discrimina por target para NO enmascarar errores de otras tablas (ej. redes sociales).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(",")
          : String(error.meta?.target ?? "");
        const message = error.message ?? "";

        const isSocialLinkConflict =
          target.includes("SocialLink") ||
          target.includes("revisionId") ||
          message.includes("ProfessionalAffiliationRevisionSocialLink") ||
          message.includes("type");

        const isAffiliationConflict =
          target.includes("professionalProfileId") ||
          target.includes("tenantId") ||
          target.includes("ProfessionalTenantAffiliation") ||
          message.includes("professionalProfileId") ||
          message.includes("ProfessionalTenantAffiliation");

        if (isAffiliationConflict && !isSocialLinkConflict) {
          throw new AffiliationAlreadyExistsError(
            professionalProfileId,
            input.tenantId,
          );
        }
      }

      throw error;
    }
  }
}