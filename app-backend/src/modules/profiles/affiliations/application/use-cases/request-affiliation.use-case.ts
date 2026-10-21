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
  ProfessionalProfileNotFoundError,
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

    try {
      // 2. Ejecuta la creación atómica dentro de la unidad de trabajo (Unit of Work).
      return await this.unitOfWork.execute(async (repos) => {
        // 2.1 Verifica duplicados antes de insertar.
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

        // 2.2 Crea la afiliación en estado inicial PENDING_REVIEW.
        const affiliation = await repos.affiliations.create({
          professionalProfileId,
          tenantId: input.tenantId,
          status: "PENDING_REVIEW",
        });

        // 2.3 Crea la primera revisión (versión 1) en PENDING_REVIEW junto a sus redes sociales.
        const revision = await repos.revisions.create({
          tenantId: input.tenantId,
          affiliationId: affiliation.id,
          revisionNumber: 1,
          description: input.content.description,
          submittedByUserId: input.actorUserId,
          socialLinks: input.content.socialLinks,
        });

        // 2.4 Registra el evento de auditoría inicial (APPLY).
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
      // Manejo de condición de carrera si dos peticiones concurrentes superan el findBy... simultáneamente
      // y la restricción UNIQUE(professionalProfileId, tenantId) de PostgreSQL/Prisma salta.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AffiliationAlreadyExistsError(
          professionalProfileId,
          input.tenantId,
        );
      }

      throw error;
    }
  }
}