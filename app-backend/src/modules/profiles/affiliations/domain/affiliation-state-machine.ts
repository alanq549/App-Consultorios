/// ARCHIVO: src/modules/profiles/affiliations/domain/affiliation-state-machine.ts
/// 
/// Propósito: Evaluador y controlador central de reglas de negocio para transiciones de afiliaciones y revisiones.
/// 
/// ¿Qué hace este archivo?
/// Aplica el reglamento oficial del sistema para cambiar de estado:
/// - Valida que el paso entre estados sea válido según la matriz de transiciones.
/// - Controla que el usuario tenga la autoridad adecuada (SELF o OWNER) para la acción solicitada.
/// - Previene auto-evaluaciones (un usuario no puede aprobarse a sí mismo).
/// - Exige motivo justificado según quién ejecute la acción (ej. obligatorio para OWNER en retiros/suspensiones).

import {
  AffiliationAuditAction,
  AffiliationRevisionStatus,
  AffiliationStatus,
  RevisionReviewContext,
  AffiliationTransitionContext,
} from "./affiliation-types";

import {
  InvalidAffiliationTransitionError,
  InvalidRevisionTransitionError,
  ObsoleteRevisionError,
  ReasonRequiredError,
  SelfReviewForbiddenError,
  UnauthorizedAffiliationActionError,
} from "./affiliation-errors";

/**
 * Matriz de reglas para la afiliación principal:
 * Define qué acciones están permitidas partiendo desde cada estado actual.
 */
const AFFILIATION_TRANSITIONS: Partial<
  Record<
    AffiliationStatus,
    Partial<Record<AffiliationAuditAction, AffiliationStatus>>
  >
> = {
  PENDING_REVIEW: {
    APPROVE_AFFILIATION: "ACTIVE",
    REJECT_AFFILIATION: "REJECTED",
    WITHDRAW: "WITHDRAWN",
  },

  ACTIVE: {
    SUSPEND: "SUSPENDED",
    WITHDRAW: "WITHDRAWN",
  },

  REJECTED: {
    REOPEN: "PENDING_REVIEW",
  },

  SUSPENDED: {
    REACTIVATE: "ACTIVE",
    WITHDRAW: "WITHDRAWN",
  },

  WITHDRAWN: {
    REOPEN: "PENDING_REVIEW",
  },
};

/**
 * Matriz de reglas para las propuestas de contenido (revisiones):
 * Solo el contenido pendiente ("PENDING_REVIEW") admite evaluación o reemplazo.
 */
const REVISION_TRANSITIONS: Partial<
  Record<
    AffiliationRevisionStatus,
    Partial<
      Record<
        | "APPROVE_CONTENT"
        | "REJECT_CONTENT"
        | "SUPERSEDE_CONTENT",
        AffiliationRevisionStatus
      >
    >
  >
> = {
  PENDING_REVIEW: {
    APPROVE_CONTENT: "APPROVED",
    REJECT_CONTENT: "REJECTED",
    SUPERSEDE_CONTENT: "SUPERSEDED",
  },
};

/**
 * Acciones exclusivas del propietario/administrador del consultorio (OWNER).
 */
const ADMINISTRATIVE_ACTIONS = new Set<AffiliationAuditAction>([
  "SUSPEND",
  "REACTIVATE",
]);

/**
 * Acciones de evaluación formal de afiliación.
 */
const REVIEW_ACTIONS = new Set<AffiliationAuditAction>([
  "APPROVE_AFFILIATION",
  "REJECT_AFFILIATION",
]);

export class AffiliationStateMachine {
  /**
   * Procesa y valida un cambio de estado en la afiliación principal.
   * 
   * Flujo de validación:
   * 1. Confirma que la transición exista en el mapa de reglas.
   * 2. Verifica la autoridad del actor (SELF vs OWNER).
   * 3. Bloquea intentos de auto-evaluación.
   * 4. Exige motivos cuando la acción o la autoridad lo requieran.
   */
  static transition(
    current: AffiliationStatus,
    action: AffiliationAuditAction,
    context: AffiliationTransitionContext,
  ): AffiliationStatus {
    const next = AFFILIATION_TRANSITIONS[current]?.[action];

    if (!next) {
      throw new InvalidAffiliationTransitionError(
        current,
        action,
      );
    }

    // 1. Validar que el actor tenga permiso para esta acción específica
    this.validateAuthority(action, context);

    // SELF solo puede actuar sobre su propia afiliación.
    if (
      (action === "WITHDRAW" || action === "REOPEN") &&
      context.actor.authority === "SELF" &&
      context.actor.userId !== context.applicantUserId
    ) {
      throw new UnauthorizedAffiliationActionError(action);
    }

    // 2. Prohibir que el solicitante apruebe o rechace su propia afiliación
    if (REVIEW_ACTIONS.has(action)) {
      if (context.actor.userId === context.applicantUserId) {
        throw new SelfReviewForbiddenError();
      }
    }

    // 3. Exigir motivo en acciones críticas
    if (action === "REJECT_AFFILIATION") {
      this.requireReason(context.reason);
    }

    if (action === "SUSPEND") {
      this.requireReason(context.reason);
    }

    /**
     * Regla especial para WITHDRAW (Retiro):
     * - Si lo ejecuta el profesional (SELF): Retiro voluntario, motivo opcional.
     * - Si lo ejecuta el propietario (OWNER): Retiro administrativo, motivo obligatorio.
     */
    if (
      action === "WITHDRAW" &&
      context.actor.authority === "OWNER"
    ) {
      this.requireReason(context.reason);
    }

    return next;
  }

  /**
   * Procesa y valida un cambio de estado en una propuesta de contenido.
   */
  static transitionRevision(
    context: RevisionReviewContext,
    action:
      | "APPROVE_CONTENT"
      | "REJECT_CONTENT"
      | "SUPERSEDE_CONTENT",
    reason?: string,
  ): AffiliationRevisionStatus {
    const transitions =
      REVISION_TRANSITIONS[context.revisionStatus];

    if (!transitions) {
      throw new ObsoleteRevisionError();
    }

    const next = transitions[action];

    if (!next) {
      throw new InvalidRevisionTransitionError(
        context.revisionStatus,
        action,
      );
    }

    // 1. Aprobar/rechazar contenido es una revisión formal: exige autoridad OWNER.
    //    Un autor (SELF) o un MEMBER no pueden evaluar propuestas.
    if (
      (action === "APPROVE_CONTENT" ||
        action === "REJECT_CONTENT") &&
      context.reviewerAuthority !== "OWNER"
    ) {
      throw new UnauthorizedAffiliationActionError(action);
    }

    // 2. Bloquear la auto-revisión: el propio autor no puede aprobar ni rechazar su contenido,
    //    aunque tenga autoridad OWNER. La decisión siempre la toma un tercero (OWNER distinto).
    if (
      (action === "APPROVE_CONTENT" ||
        action === "REJECT_CONTENT") &&
      context.reviewerUserId === context.submittedByUserId
    ) {
      throw new SelfReviewForbiddenError();
    }

    // 3. Solo el propio autor puede superseder su propuesta pendiente.
    if (
      action === "SUPERSEDE_CONTENT" &&
      context.reviewerUserId !== context.submittedByUserId
    ) {
      throw new UnauthorizedAffiliationActionError(action);
    }

    // Exigir motivo si se rechaza el contenido
    if (action === "REJECT_CONTENT") {
      this.requireReason(reason);
    }

    return next;
  }

  /**
   * Valida si el tipo de autoridad del actor (SELF o OWNER) le permite realizar la acción.
   */
  private static validateAuthority(
    action: AffiliationAuditAction,
    context: AffiliationTransitionContext,
  ): void {
    // SUSPEND y REACTIVATE son exclusivas para el OWNER del tenant
    if (ADMINISTRATIVE_ACTIONS.has(action)) {
      if (context.actor.authority !== "OWNER") {
        throw new UnauthorizedAffiliationActionError(action);
      }

      return;
    }

    // APPROVE_AFFILIATION y REJECT_AFFILIATION son revisiones formales de la solicitud:
    // exclusivas del OWNER. Un MEMBER nunca evalúa; un SELF queda descartado aquí y,
    // si además es el solicitante, se rechaza más abajo por auto-revisión.
    if (REVIEW_ACTIONS.has(action)) {
      if (context.actor.authority !== "OWNER") {
        throw new UnauthorizedAffiliationActionError(action);
      }

      return;
    }

    // REOPEN es exclusivo del profesional solicitante.
    // OWNER y MEMBER no pueden reabrir una afiliación.
    if (action === "REOPEN") {
      if (context.actor.authority !== "SELF") {
        throw new UnauthorizedAffiliationActionError(action);
      }

      return;
    }

    // WITHDRAW lo pueden ejecutar tanto el profesional (SELF) como el OWNER
    if (action === "WITHDRAW") {
      if (
        context.actor.authority !== "SELF" &&
        context.actor.authority !== "OWNER"
      ) {
        throw new UnauthorizedAffiliationActionError(action);
      }

      return;
    }
  }

  /**
   * Comprueba que la cadena de texto con el motivo no esté vacía ni contenga solo espacios.
   */
  private static requireReason(reason?: string): void {
    if (!reason?.trim()) {
      throw new ReasonRequiredError();
    }
  }
}