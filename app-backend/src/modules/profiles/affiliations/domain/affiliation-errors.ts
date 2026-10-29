/// ARCHIVO: src/modules/profiles/affiliations/domain/affiliation-errors.ts
/// 
/// Propósito: Definición de errores de negocio puros del dominio de Afiliaciones.
/// 
/// Explicación sencilla:
/// Este archivo contiene los "mensajes de alerta" del dominio. Si una regla de negocio se rompe
/// (como intentar una acción no permitida o no tener la autoridad requerida), el sistema lanza
/// uno de estos errores. 
/// 
/// Nota de diseño (Desacoplamiento):
/// Estos errores extienden directamente de `Error` de TypeScript. No conocen conceptos de HTTP
/// (códigos 400, 403, 409, etc.). El mapeo hacia códigos de respuesta web se realiza fuera
/// de la capa de dominio.

/**
 * Error de dominio: Transición inválida en el ciclo de vida de la afiliación.
 * 
 * ¿Cuándo ocurre?
 * Cuando se intenta ejecutar una acción que no está permitida desde el estado actual de la afiliación.
 * Ejemplo: Intentar "aprobar" una afiliación que ya se encuentra "activa" o "suspendida".
 */
export class InvalidAffiliationTransitionError extends Error {
  constructor(from: string, action: string) {
    super(
      `La acción ${action} no está permitida desde el estado ${from}`,
    );
    this.name = "InvalidAffiliationTransitionError";
  }
}

/**
 * Error de dominio: Transición inválida en una propuesta de revisión de contenido.
 * 
 * ¿Cuándo ocurre?
 * Cuando se intenta cambiar el estado de una propuesta de contenido de manera ilógica.
 * Ejemplo: Intentar "rechazar" una propuesta que ya fue previamente "aprobada".
 */
export class InvalidRevisionTransitionError extends Error {
  constructor(from: string, action: string) {
    super(
      `La acción ${action} no está permitida desde el estado de revisión ${from}`,
    );
    this.name = "InvalidRevisionTransitionError";
  }
}

/**
 * Error de dominio: Intento de auto-evaluación o auto-revisión.
 * 
 * ¿Cuándo ocurre?
 * Cuando el usuario que solicita la afiliación o envía un contenido intenta evaluarse o aprobarse a sí mismo.
 * Garantiza la imparcialidad del proceso mediante una revisión obligatoria por un tercero.
 */
export class SelfReviewForbiddenError extends Error {
  constructor() {
    super(
      "No puedes revisar tu propia afiliación o propuesta",
    );
    this.name = "SelfReviewForbiddenError";
  }
}

/**
 * Error de dominio: Intento de evaluar una revisión que ya no está disponible.
 * 
 * ¿Cuándo ocurre?
 * Cuando un revisor intenta aprobar o rechazar una propuesta que ya fue resuelta o que
 * fue reemplazada por una nueva versión enviada por el profesional (estado SUPERSEDED).
 */
export class ObsoleteRevisionError extends Error {
  constructor() {
    super(
      "La revisión ya no está pendiente y no puede aprobarse ni rechazarse",
    );
    this.name = "ObsoleteRevisionError";
  }
}

/**
 * Error de dominio: Intento de ejecutar una acción sin el nivel de autoridad necesario.
 * 
 * ¿Cuándo ocurre?
 * Cuando un usuario intenta realizar una acción reservada para un rol distinto.
 * Ejemplo: Un profesional intenta suspender una afiliación (reservado para OWNER)
 * o un usuario arbitrario sin permisos intenta ejecutar un retiro.
 */
export class UnauthorizedAffiliationActionError extends Error {
  constructor(action: string) {
    super(
      `El actor no tiene autoridad para ejecutar la acción ${action}`,
    );
    this.name = "UnauthorizedAffiliationActionError";
  }
}

/**
 * Error de dominio: Ausencia de un motivo obligatorio para la operación.
 * 
 * ¿Cuándo ocurre?
 * Cuando se ejecuta una acción crítica que exige una explicación por escrito
 * (ej. rechazos, suspensiones, o un retiro administrativo por parte del OWNER) y el texto está vacío.
 */
export class ReasonRequiredError extends Error {
  constructor() {
    super(
      "Se requiere un motivo para realizar esta acción",
    );
    this.name = "ReasonRequiredError";
  }
}

/**
 * Error de aplicación/dominio: El usuario autenticado no posee un perfil profesional asociado.
 */
export class ProfessionalProfileNotFoundError extends Error {
  constructor(public readonly userId: number) {
    super(
      `El usuario con ID ${userId} no posee un perfil profesional registrado`,
    );
    this.name = "ProfessionalProfileNotFoundError";
  }
}

/**
 * Error de dominio: Conflicto por intento de duplicar una afiliación existente entre perfil y tenant.
 */
export class AffiliationAlreadyExistsError extends Error {
  constructor(
    public readonly professionalProfileId: number,
    public readonly tenantId: number,
    public readonly currentStatus?: string,
  ) {
    super(
      `Ya existe una afiliación para el perfil ${professionalProfileId} en el tenant ${tenantId}` +
        (currentStatus ? ` (estado actual: ${currentStatus})` : ""),
    );
    this.name = "AffiliationAlreadyExistsError";
  }
}

/**
 * Error de aplicación/dominio: La afiliación solicitada no existe dentro del tenant.
 */
export class AffiliationNotFoundError extends Error {
  constructor(public readonly affiliationId: number, public readonly tenantId: number) {
    super(
      `No se encontró la afiliación con ID ${affiliationId} en el tenant ${tenantId}`,
    );
    this.name = "AffiliationNotFoundError";
  }
}

/**
 * Error de dominio: El consultorio/tenant no existe o no se encuentra activo.
 */
export class TenantNotActiveError extends Error {
  constructor(public readonly tenantId: number) {
    super(
      `El consultorio/tenant con ID ${tenantId} no existe o no se encuentra activo`,
    );
    this.name = "TenantNotActiveError";
  }
}

export const InactiveTenantError = TenantNotActiveError;
export type InactiveTenantError = TenantNotActiveError;

/**
 * Error de dominio: El contenido propuesto contiene múltiples enlaces para la misma red social.
 */
export class DuplicateSocialLinkTypeError extends Error {
  constructor(public readonly duplicateType: string) {
    super(
      `No se permite más de un enlace para la red social ${duplicateType} en la misma propuesta`,
    );
    this.name = "DuplicateSocialLinkTypeError";
  }
}

/**
 * Error de dominio: Alcance inválido para una retención de auditoría.
 *
 * ¿Cuándo ocurre?
 * Cuando se intenta retener un evento de auditoría específico sin declarar la afiliación
 * a la que pertenece. Sin afiliación no puede verificarse que el evento corresponda al
 * mismo tenant y a la misma afiliación declarados.
 */
export class InvalidAuditHoldScopeError extends Error {
  constructor(
    public readonly affiliationId: number | null,
    public readonly auditEventId: number | null,
  ) {
    super(
      "El alcance de la retención es inválido: retener un evento específico requiere declarar su afiliación",
    );
    this.name = "InvalidAuditHoldScopeError";
  }
}

/**
 * Error de aplicación/dominio: El evento de auditoría referenciado no existe dentro del tenant.
 */
export class AuditEventNotFoundError extends Error {
  constructor(
    public readonly auditEventId: number,
    public readonly tenantId: number,
  ) {
    super(
      `No se encontró el evento de auditoría con ID ${auditEventId} en el tenant ${tenantId}`,
    );
    this.name = "AuditEventNotFoundError";
  }
}

/**
 * Error de dominio: El evento de auditoría no pertenece a la afiliación declarada.
 *
 * ¿Cuándo ocurre?
 * Cuando el evento existe en el tenant, pero su `affiliationId` difiere de la afiliación
 * indicada en la retención (invariante `event.affiliationId == hold.affiliationId`).
 */
export class AuditHoldScopeMismatchError extends Error {
  constructor(
    public readonly auditEventId: number,
    public readonly affiliationId: number,
  ) {
    super(
      `El evento de auditoría ${auditEventId} no pertenece a la afiliación ${affiliationId}`,
    );
    this.name = "AuditHoldScopeMismatchError";
  }
}

/**
 * Error de aplicación/dominio: La retención de auditoría no existe dentro del tenant.
 *
 * También cubre el caso de una retención ajena al tenant: un ID de otro tenant
 * se trata como no encontrado para no filtrar su existencia.
 */
export class AuditHoldNotFoundError extends Error {
  constructor(
    public readonly holdId: number,
    public readonly tenantId: number,
  ) {
    super(
      `No se encontró la retención de auditoría con ID ${holdId} en el tenant ${tenantId}`,
    );
    this.name = "AuditHoldNotFoundError";
  }
}

/**
 * Error de dominio: Intento de liberar una retención de auditoría ya liberada.
 *
 * ¿Cuándo ocurre?
 * Cuando dos solicitudes concurrentes liberan la misma retención. La liberación es
 * idempotente en su efecto —nunca sobrescribe la fecha ni el actor originales—,
 * pero la segunda solicitud se rechaza de forma explícita.
 */
export class AuditHoldAlreadyReleasedError extends Error {
  constructor(public readonly holdId: number) {
    super(
      `La retención de auditoría con ID ${holdId} ya fue liberada previamente`,
    );
    this.name = "AuditHoldAlreadyReleasedError";
  }
}

/**
 * Error de dominio: parámetro inválido en la política de retención/purga de auditoría.
 *
 * ¿Cuándo ocurre?
 * Cuando una ejecución de purga recibe un plazo de retención o un tamaño de lote que no es
 * un entero positivo. Se rechaza antes de tocar la base de datos: una política inválida
 * (por ejemplo, un plazo en cero) eliminaría auditoría sin respetar la retención.
 */
export class InvalidRetentionPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRetentionPolicyError";
  }
}
