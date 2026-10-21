/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/review-affiliation-revision.use-case.ts
/// Caso de uso: Evaluar (aprobar o rechazar) una propuesta de revisión de afiliación (Review Revision).
///
/// Propósito: Permite al OWNER activo de un consultorio tomar una decisión sobre una revisión pendiente.
/// Concurrencia y consistencia:
/// 1. Adquiere un bloqueo pesimista (`FOR UPDATE`) sobre la afiliación para serializar decisiones.
/// 2. Valida obsolescencia: si la revisión enviada por el revisor ya no es la más reciente o ya no está
///    en estado PENDING_REVIEW (por ejemplo, si el profesional envió otra propuesta en carrera),
///    rechaza inmediatamente con `ObsoleteRevisionError`.
/// 3. Bloquea la auto-revisión (`SelfReviewForbiddenError`).
/// 4. Si la afiliación estaba en PENDING_REVIEW: aprueba o rechaza la afiliación completa.
/// 5. Si la afiliación ya estaba en ACTIVE: aprueba o rechaza únicamente la revisión de contenido,
///    manteniendo la afiliación activa y el contenido previamente publicado intacto en caso de rechazo.

import {
  AffiliationNotFoundError,
  ObsoleteRevisionError,
  SelfReviewForbiddenError,
  UnauthorizedAffiliationActionError,
  InvalidAffiliationTransitionError,
} from "../../domain/affiliation-errors";
import { AffiliationStateMachine } from "../../domain/affiliation-state-machine";
import type { ActiveMembershipChecker } from "../ports/active-membership-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationRevisionRecord } from "../ports/affiliation-revision-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export type ReviewDecision = "APPROVE" | "REJECT";

export interface ReviewAffiliationRevisionInput {
  /** ID de la sede o consultorio (tenant) */
  tenantId: number;
  /** ID de la afiliación sobre la cual se evalúa la revisión */
  affiliationId: number;
  /** ID de la revisión específica que el revisor inspeccionó y desea dictaminar */
  revisionId: number;
  /** ID del usuario que toma la decisión (debe ser OWNER del tenant) */
  reviewerUserId: number;
  /** Decisión a aplicar: APPROVE o REJECT */
  decision: ReviewDecision;
  /** Motivo u observación de la decisión (obligatorio para rechazos) */
  reason?: string;
}

export interface ReviewAffiliationRevisionOutput {
  /** Registro de la afiliación actualizado */
  affiliation: AffiliationRecord;
  /** Registro de la revisión evaluada con su nuevo estado (APPROVED o REJECTED) */
  revision: AffiliationRevisionRecord;
}

export class ReviewAffiliationRevisionUseCase {
  /**
   * @param {ActiveMembershipChecker} membershipChecker - Verificador de rol y membresía activa en el tenant.
   * @param {AffiliationUnitOfWork} unitOfWork - Unidad de trabajo transaccional.
   */
  constructor(
    private readonly membershipChecker: ActiveMembershipChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  /**
   * Ejecuta la evaluación (aprobación o rechazo) de una revisión de afiliación.
   *
   * @param {ReviewAffiliationRevisionInput} input - Parámetros de la revisión y decisión.
   * @returns {Promise<ReviewAffiliationRevisionOutput>} Afiliación y revisión resultantes.
   *
   * @throws {UnauthorizedAffiliationActionError} Si el revisor no tiene membresía activa de tipo OWNER en el tenant.
   * @throws {SelfReviewForbiddenError} Si el revisor es el mismo usuario que propuso la revisión.
   * @throws {AffiliationNotFoundError} Si la afiliación no existe en el tenant.
   * @throws {ObsoleteRevisionError} Si la revisión ya no es la más reciente o no está en PENDING_REVIEW.
   * @throws {ReasonRequiredError} Si se rechaza y no se proporciona un motivo.
   */
  async execute(
    input: ReviewAffiliationRevisionInput,
  ): Promise<ReviewAffiliationRevisionOutput> {
    // 1. Pre-transaction: verify reviewer has OWNER role.
    const preMembership = await this.membershipChecker.getActiveMembership(
      input.reviewerUserId,
      input.tenantId,
    );
    if (!preMembership || preMembership.role !== "OWNER") {
      // No transaction should be started for unauthorized users.
      throw new UnauthorizedAffiliationActionError(
        input.decision === "APPROVE" ? "APPROVE_CONTENT" : "REJECT_CONTENT",
      );
    }

    // Ejecutar la decisión atómicamente dentro del Unit of Work transaccional.
    return await this.unitOfWork.execute(async (repos) => {
      // 2. Revalidar dentro del límite transaccional que el revisor mantenga su membresía activa como OWNER.
      // Utilizamos lockActiveMembership directamente sobre el repositorio transaccional para bloquear
      // la fila bajo la misma transacción y prevenir revocaciones concurrentes sin caer en fallbacks no transaccionales.
      const membership = await repos.memberships.lockActiveMembership(
        input.reviewerUserId,
        input.tenantId,
      );


      if (!membership || membership.role !== "OWNER") {
        throw new UnauthorizedAffiliationActionError(
          input.decision === "APPROVE" ? "APPROVE_CONTENT" : "REJECT_CONTENT",
        );
      }

      // 2. Adquirir bloqueo pesimista en PostgreSQL sobre la fila de la afiliación.
      // Serializa transacciones concurrentes (ej. aprobación paralela o nueva propuesta en carrera).
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

      // 2.2 Obtener la afiliación actual.
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

      // 2.3 Obtener la revisión más reciente de la afiliación.
      const latestRevision =
        await repos.revisions.findLatestByAffiliationId(
          input.tenantId,
          input.affiliationId,
        );

      // 2.4 Control de obsolescencia y concurrencia:
      // Si la revisión solicitada no es la más reciente o ya no está pendiente,
      // se deniega la decisión con ObsoleteRevisionError para evitar aplicar decisiones sobre versiones viejas.
      if (
        !latestRevision ||
        latestRevision.id !== input.revisionId ||
        latestRevision.status !== "PENDING_REVIEW"
      ) {
        throw new ObsoleteRevisionError();
      }

      // 2.5 Bloqueo de auto-revisión: el autor de la propuesta no puede auto-aprobarse ni auto-rechazarse.
      if (latestRevision.submittedByUserId === input.reviewerUserId) {
        throw new SelfReviewForbiddenError();
      }

      const now = new Date();

      // 2.6 Bifurcación según el estado actual de la afiliación:
      if (affiliation.status === "PENDING_REVIEW") {
        // CASO A: Primera solicitud de afiliación.
        if (input.decision === "APPROVE") {
          // Valida la transición formal en la máquina de estados.
          AffiliationStateMachine.transition(
            "PENDING_REVIEW",
            "APPROVE_AFFILIATION",
            {
              applicantUserId: latestRevision.submittedByUserId,
              actor: { userId: input.reviewerUserId, authority: "OWNER" },
              reason: input.reason,
            },
          );

          // Actualiza la afiliación a ACTIVE con Compare-and-Set.
          const affUpdate = await repos.affiliations.updateStatusIfCurrent(
            input.tenantId,
            input.affiliationId,
            "PENDING_REVIEW",
            "ACTIVE",
          );

          if (!affUpdate.updated) {
            throw new ObsoleteRevisionError();
          }

          // Actualiza la revisión inicial a APPROVED.
          const revUpdate = await repos.revisions.updateStatusIfCurrent(
            input.tenantId,
            input.revisionId,
            "PENDING_REVIEW",
            "APPROVED",
            {
              reviewedByUserId: input.reviewerUserId,
              reviewedAt: now,
            },
          );

          if (!revUpdate.updated) {
            throw new ObsoleteRevisionError();
          }

          // Registra eventos de auditoría (afiliación aprobada y contenido aprobado).
          await repos.audit.append({
            tenantId: input.tenantId,
            affiliationId: input.affiliationId,
            action: "APPROVE_AFFILIATION",
            actorUserId: input.reviewerUserId,
            previousStatus: "PENDING_REVIEW",
            nextStatus: "ACTIVE",
            reason: input.reason,
            occurredAt: now,
          });

          await repos.audit.append({
            tenantId: input.tenantId,
            affiliationId: input.affiliationId,
            revisionId: input.revisionId,
            action: "APPROVE_CONTENT",
            actorUserId: input.reviewerUserId,
            previousStatus: "ACTIVE",
            nextStatus: "ACTIVE",
            reason: input.reason,
            occurredAt: now,
          });

          return {
            affiliation: affUpdate.record,
            revision: revUpdate.record,
          };
        } else {
          // Rechazo de la solicitud inicial de afiliación.
          AffiliationStateMachine.transition(
            "PENDING_REVIEW",
            "REJECT_AFFILIATION",
            {
              applicantUserId: latestRevision.submittedByUserId,
              actor: { userId: input.reviewerUserId, authority: "OWNER" },
              reason: input.reason,
            },
          );

          const affUpdate = await repos.affiliations.updateStatusIfCurrent(
            input.tenantId,
            input.affiliationId,
            "PENDING_REVIEW",
            "REJECTED",
          );

          if (!affUpdate.updated) {
            throw new ObsoleteRevisionError();
          }

          const revUpdate = await repos.revisions.updateStatusIfCurrent(
            input.tenantId,
            input.revisionId,
            "PENDING_REVIEW",
            "REJECTED",
            {
              reviewedByUserId: input.reviewerUserId,
              reviewedAt: now,
              rejectionReason: input.reason,
            },
          );

          if (!revUpdate.updated) {
            throw new ObsoleteRevisionError();
          }

          await repos.audit.append({
            tenantId: input.tenantId,
            affiliationId: input.affiliationId,
            action: "REJECT_AFFILIATION",
            actorUserId: input.reviewerUserId,
            previousStatus: "PENDING_REVIEW",
            nextStatus: "REJECTED",
            reason: input.reason,
            occurredAt: now,
          });

          return {
            affiliation: affUpdate.record,
            revision: revUpdate.record,
          };
        }
      } else if (affiliation.status === "ACTIVE") {
        // CASO B: La afiliación ya está ACTIVE. Se evalúa únicamente una actualización de contenido.
        const action =
          input.decision === "APPROVE" ? "APPROVE_CONTENT" : "REJECT_CONTENT";

        // Valida la transición de revisión en la máquina de estados.
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: latestRevision.submittedByUserId,
            reviewerUserId: input.reviewerUserId,
            reviewerAuthority: "OWNER",
            revisionStatus: "PENDING_REVIEW",
          },
          action,
          input.reason,
        );

        const nextRevisionStatus =
          input.decision === "APPROVE" ? "APPROVED" : "REJECTED";

        const revUpdate = await repos.revisions.updateStatusIfCurrent(
          input.tenantId,
          input.revisionId,
          "PENDING_REVIEW",
          nextRevisionStatus,
          {
            reviewedByUserId: input.reviewerUserId,
            reviewedAt: now,
            rejectionReason: input.decision === "REJECT" ? input.reason : null,
          },
        );

        if (!revUpdate.updated) {
          throw new ObsoleteRevisionError();
        }

        // Registra evento de auditoría de revisión de contenido.
        await repos.audit.append({
          tenantId: input.tenantId,
          affiliationId: input.affiliationId,
          revisionId: input.revisionId,
          action,
          actorUserId: input.reviewerUserId,
          previousStatus: affiliation.status,
          nextStatus: affiliation.status,
          reason: input.reason,
          occurredAt: now,
        });

        // La afiliación permanece ACTIVE y no se altera su registro principal.
        return {
          affiliation,
          revision: revUpdate.record,
        };

      } else {
        // Estado no permitido para aprobar/rechazar contenido.
        throw new InvalidAffiliationTransitionError(
          affiliation.status,
          input.decision === "APPROVE" ? "APPROVE_CONTENT" : "REJECT_CONTENT",
        );
      }


      
    });
  }
}
