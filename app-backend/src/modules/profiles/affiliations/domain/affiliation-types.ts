/// ARCHIVO: src/modules/profiles/affiliations/domain/affiliation-types.ts
/// 
/// Propósito: Definición centralizada de tipos, constantes y estructuras de autoridad del dominio de Afiliaciones.
/// 
/// Responsabilidades:
/// - Definir las máquinas de estado para el ciclo de vida de la afiliación y sus revisiones de contenido.
/// - Enumerar los eventos auditables (acciones) registrados en la bitácora del sistema.
/// - Modelar la autoridad explícita del actor (SELF vs OWNER) para garantizar el control de acceso en transiciones sensibles.
/// - Proveer las interfaces de contexto necesarias para validar transiciones y revisiones.


/**
 * Plataformas externas admitidas por el dominio de afiliaciones.
 */ 

export const SOCIAL_TYPES = [
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "WEBSITE",
] as const;


export type SocialType = (typeof SOCIAL_TYPES)[number];

/**
 * Estados del ciclo de vida global de una afiliación en el sistema.
 */
export const AFFILIATION_STATUSES = [
  "PENDING_REVIEW", // Afiliación solicitada, pendiente de evaluación
  "ACTIVE",         // Afiliación aprobada y activa
  "REJECTED",       // Solicitud de afiliación rechazada
  "SUSPENDED",      // Afiliación pausada temporalmente por administración
  "WITHDRAWN",      // Afiliación retirada por el profesional o el propietario
] as const;

export type AffiliationStatus =
  (typeof AFFILIATION_STATUSES)[number];

/**
 * Estados del ciclo de vida de una propuesta de contenido/revisión.
 */
export const REVISION_STATUSES = [
  "PENDING_REVIEW", // Contenido propuesto pendiente de revisión
  "APPROVED",       // Contenido aprobado y publicado
  "REJECTED",       // Contenido rechazado por observaciones
  "SUPERSEDED",     // Contenido reemplazado por una versión posterior
] as const;

export type AffiliationRevisionStatus =
  (typeof REVISION_STATUSES)[number];

/**
 * Catálogo de acciones registrables en el historial de auditoría del dominio.
 */
export const AFFILIATION_AUDIT_ACTIONS = [
  "APPLY",              // Solicitud inicial de afiliación
  "SUBMIT_CONTENT",     // Envío de propuesta de contenido
  "SUPERSEDE_CONTENT",  // Anulación/remplazo de contenido previo
  "APPROVE_AFFILIATION",// Aprobación global de la afiliación
  "REJECT_AFFILIATION", // Rechazo global de la afiliación
  "APPROVE_CONTENT",    // Aprobación de un bloque de contenido
  "REJECT_CONTENT",     // Rechazo de un bloque de contenido
  "SUSPEND",            // Suspensión administrativa
  "REACTIVATE",         // Reactivación de una afiliación suspendida
  "WITHDRAW",           // Retiro voluntario o administrativo
  "REOPEN",             // Reapertura de proceso
  "BACKFILL",           // Carga masiva o migración histórica
] as const;

export type AffiliationAuditAction =
  (typeof AFFILIATION_AUDIT_ACTIONS)[number];

/**
 * Nivel de autoridad con el que un usuario ejecuta una acción sobre la afiliación:
 * 
 * - SELF  : El propio profesional dueño de la afiliación.
 * - OWNER : Propietario o administrador principal de la sede/consultorio (Tenant).
 */
export type AffiliationActorAuthority =
  | "SELF"
  | "OWNER"
  | "MEMBER";

/**
 * Datos de identidad y autoridad del usuario que ejecuta la acción (actor).
 * 
 * Nota de diseño:
 * El dominio no consulta Tenancy directamente. La verificación de si el usuario
 * es OWNER o tiene membresía activa ocurre en el Caso de Uso (fuera del dominio)
 * y se inyecta aquí de forma resuelta.
 */
export interface AffiliationActorContext {
  /** ID del usuario que ejecuta la acción */
  userId: number;
  /** Rol o tipo de autoridad verificado para esta operación */
  authority: AffiliationActorAuthority;
}

/**
 * Enlace a red social o perfil externo asociado al contenido.
 */
export interface SocialLinkInput {
  /** Plataforma externa (ej. "LINKEDIN", "TWITTER", "INSTAGRAM") */
  type: SocialType;
  /** Enlace URL completo */
  url: string;
}

/**
 * Contenido informativo propuesto dentro de una revisión.
 */
export interface AffiliationContent {
  /** Biografía o descripción del perfil */
  description: string;
  /** Lista de redes sociales asociadas */
  socialLinks: SocialLinkInput[];
}

/**
 * Contexto de evaluación para ejecutar una transición de estado en la afiliación.
 */
export interface AffiliationTransitionContext {
  /** ID del usuario profesional solicitante o dueño de la afiliación */
  applicantUserId: number;
  /** Contexto resuelto con ID y nivel de autoridad (SELF u OWNER) del actor */
  actor: AffiliationActorContext;
  /** Motivo u observación de la transición (obligatorio u opcional según la acción y el actor) */
  reason?: string; 

}

/**
 * Contexto de evaluación para aprobar o rechazar propuestas de contenido.
 */
export interface RevisionReviewContext {
  /** ID del usuario que envió la propuesta de contenido */
  submittedByUserId: number;
  /** ID del usuario que evalúa el contenido */
  reviewerUserId: number;
  /** Nivel de autoridad del revisor (SELF u OWNER) */
  reviewerAuthority: AffiliationActorAuthority;
  /** Estado actual de la revisión que se pretende cambiar */
  revisionStatus: AffiliationRevisionStatus;
}