/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/submit-affiliation-content.use-case.ts
/// Caso de uso: Enviar o actualizar contenido público de una afiliación activa (Submit Content).
///
/// Propósito: Permite que el profesional afiliado proponga una nueva descripción y enlaces sociales.
/// Concurrencia y consistencia:
/// 1. Adquiere un bloqueo pesimista (`FOR UPDATE`) sobre la afiliación para serializar operaciones.
/// 2. Si existe una revisión previa en PENDING_REVIEW, la marca atómicamente como SUPERSEDED.
/// 3. Crea la nueva revisión versionada (revisionNumber N+1) en estado PENDING_REVIEW.
/// 4. Registra los eventos de auditoría correspondientes dentro de la misma transacción.

import type { AffiliationContent } from "../../domain/affiliation-types";
import {
  AffiliationNotFoundError,
  DuplicateSocialLinkTypeError,
  InvalidAffiliationTransitionError,
  ObsoleteRevisionError,
  ProfessionalProfileNotFoundError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import type { ProfessionalProfileOwnerChecker } from "../ports/professional-profile-owner-checker";
import type {
  AffiliationRevisionRecord,
} from "../ports/affiliation-revision-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface SubmitAffiliationContentInput {
  /** ID del tenant/sede del consultorio */
  tenantId: number;
  /** ID de la afiliación a la que pertenece el contenido */
  affiliationId: number;
  /** ID del usuario autenticado que propone el contenido */
  actorUserId: number;
  /** Nuevo contenido público propuesto (descripción y enlaces sociales) */
  content: AffiliationContent;
}

export interface SubmitAffiliationContentOutput {
  /** Nueva revisión creada en estado PENDING_REVIEW */
  revision: AffiliationRevisionRecord;
  /** Indica si una revisión previa fue reemplazada a SUPERSEDED */
  supersededPreviousRevision: boolean;
}

export class SubmitAffiliationContentUseCase {
  /**
   * @param {ProfessionalProfileOwnerChecker} profileOwnerChecker - Verificador de titularidad del perfil profesional.
   * @param {AffiliationUnitOfWork} unitOfWork - Unidad de trabajo transaccional.
   */
  constructor(
    private readonly profileOwnerChecker: ProfessionalProfileOwnerChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  /**
   * Ejecuta la propuesta de nuevo contenido público para una afiliación.
   *
   * @param {SubmitAffiliationContentInput} input - Parámetros de la propuesta de contenido.
   * @returns {Promise<SubmitAffiliationContentOutput>} Resultado con la nueva revisión creada y bandera de reemplazo.
   *
   * @throws {ProfessionalProfileNotFoundError} Si el usuario no tiene perfil profesional registrado.
   * @throws {TenantNotActiveError} Si el tenant no existe o no está activo.
   * @throws {DuplicateSocialLinkTypeError} Si el contenido incluye enlaces duplicados para la misma red social.
   * @throws {AffiliationNotFoundError} Si la afiliación no existe o no pertenece al tenant.
   * @throws {UnauthorizedAffiliationActionError} Si el profesional no es dueño de la afiliación.
   * @throws {InvalidAffiliationTransitionError} Si la afiliación no se encuentra en estado ACTIVE.
   * @throws {ObsoleteRevisionError} Si la revisión pendiente previa no pudo actualizarse a SUPERSEDED por conflicto concurrente.
   */
  async execute(
    input: SubmitAffiliationContentInput,
  ): Promise<SubmitAffiliationContentOutput> {
    // 1. Obtener y validar el perfil profesional del actor.
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

    // 3. Ejecutar dentro de la unidad de trabajo (Unit of Work) transaccional.
    return await this.unitOfWork.execute(async (repos) => {
      // 3.1 Valida que el tenant exista y esté en estado ACTIVE.
      const isTenantActive = await repos.tenants.isActiveTenant(input.tenantId);
      if (!isTenantActive) {
        throw new TenantNotActiveError(input.tenantId);
      }

      // 3.2 Bloqueo pesimista de fila en PostgreSQL para serializar cualquier
      // operación concurrente sobre esta afiliación y sus revisiones.
      const locked = await repos.affiliations.lockForRevisionWorkflow(
        input.tenantId,
        input.affiliationId,
      );

      if (!locked) {
        throw new AffiliationNotFoundError(
          input.affiliationId,
          input.tenantId,
        );
      }

      // 3.3 Obtener la afiliación y verificar propiedad y estado.
      const affiliation = await repos.affiliations.findById(
        input.tenantId,
        input.affiliationId,
      );

      if (!affiliation) {
        throw new AffiliationNotFoundError(
          input.affiliationId,
          input.tenantId,
        );
      }

      if (affiliation.professionalProfileId !== professionalProfileId) {
        throw new UnauthorizedAffiliationActionError("SUBMIT_CONTENT");
      }

      // Solo una afiliación activa admite actualizaciones de contenido público.
      if (affiliation.status !== "ACTIVE") {
        throw new InvalidAffiliationTransitionError(
          affiliation.status,
          "SUBMIT_CONTENT",
        );
      }

      // 2.3 Consultar la última revisión enviada para determinar versión y estado.
      const latestRevision =
        await repos.revisions.findLatestByAffiliationId(
          input.tenantId,
          input.affiliationId,
        );

      let supersededPrevious = false;

      // 2.4 Si la última revisión seguía PENDING_REVIEW, pasa atómicamente a SUPERSEDED.
      if (latestRevision && latestRevision.status === "PENDING_REVIEW") {
        const updateResult = await repos.revisions.updateStatusIfCurrent(
          input.tenantId,
          latestRevision.id,
          "PENDING_REVIEW",
          "SUPERSEDED",
        );

        if (!updateResult.updated) {
          throw new ObsoleteRevisionError();
        }

        supersededPrevious = true;

        // Registrar auditoría por la versión anterior que fue reemplazada.
        await repos.audit.append({
          tenantId: input.tenantId,
          affiliationId: input.affiliationId,
          revisionId: latestRevision.id,
          action: "SUPERSEDE_CONTENT",
          actorUserId: input.actorUserId,
          previousStatus: affiliation.status,
          nextStatus: affiliation.status,
          occurredAt: new Date(),
        });
      }

      // 2.5 Calcular el siguiente número correlativo de revisión (revisionNumber).
      const nextRevisionNumber = latestRevision
        ? latestRevision.revisionNumber + 1
        : 1;

      // 2.6 Crear la nueva revisión en PENDING_REVIEW con sus redes sociales.
      const newRevision = await repos.revisions.create({
        tenantId: input.tenantId,
        affiliationId: input.affiliationId,
        revisionNumber: nextRevisionNumber,
        description: input.content.description,
        submittedByUserId: input.actorUserId,
        socialLinks: input.content.socialLinks,
      });

      // 2.7 Registrar auditoría del envío de nuevo contenido (SUBMIT_CONTENT).
      await repos.audit.append({
        tenantId: input.tenantId,
        affiliationId: input.affiliationId,
        revisionId: newRevision.id,
        action: "SUBMIT_CONTENT",
        actorUserId: input.actorUserId,
        previousStatus: affiliation.status,
        nextStatus: affiliation.status,
        occurredAt: new Date(),
      });

      return {
        revision: newRevision,
        supersededPreviousRevision: supersededPrevious,
      };
    });
  }
}
