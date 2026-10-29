/// ARCHIVO: src/modules/profiles/affiliations/application/ports/affiliation-audit-hold-repository.ts
/// Propósito: Puerto de salida para la gestión de retenciones de auditoría (Audit Hold) que
/// suspenden temporalmente la purga física de eventos de auditoría de afiliaciones.
///
/// Nota de responsabilidades:
/// El adaptador de infraestructura es responsable de la persistencia y de las operaciones
/// atómicas (liberación condicional). Las reglas de validación del alcance y de consistencia
/// entre tenant, afiliación y evento pertenecen a la capa de aplicación.

/**
 * Registro de retención de auditoría persistido en base de datos.
 */
export interface AuditHoldRecord {
  id: number;
  tenantId: number;
  /** Alcance: `null` abarca todo el tenant o toda la auditoría de la afiliación. */
  affiliationId: number | null;
  /** Alcance: `null` abarca el tenant o la afiliación; nunca un evento específico. */
  auditEventId: number | null;
  /** Justificación de la retención. */
  reason: string;
  /** Usuario que solicitó la retención. */
  requestedByUserId: number;
  /** Expiración por tiempo (`null` = indefinida mientras no se libere). */
  expiresAt: Date | null;
  /** Fecha de liberación (`null` = retención vigente). */
  releasedAt: Date | null;
  /** Usuario que liberó la retención (`null` mientras está vigente). */
  releasedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parámetros para crear una retención de auditoría.
 *
 * `requestedByUserId` se persiste para trazabilidad, pero el caso de uso lo obtiene
 * siempre del contexto autenticado: el cliente no puede elegir al actor.
 * El alcance (`affiliationId` / `auditEventId`) debe venir ya validado por el caso de uso.
 */
export interface CreateAuditHoldInput {
  tenantId: number;
  affiliationId: number | null;
  auditEventId: number | null;
  reason: string;
  requestedByUserId: number;
  expiresAt: Date | null;
}

/**
 * Resultado discriminado de una liberación.
 *
 * La liberación es una operación condicional: sólo actualiza una retención vigente y
 * nunca sobrescribe la liberación original.
 */
export type ReleaseAuditHoldOutcome =
  | { outcome: "RELEASED"; hold: AuditHoldRecord }
  | { outcome: "ALREADY_RELEASED"; hold: AuditHoldRecord }
  | { outcome: "NOT_FOUND" };

/**
 * Contrato del repositorio para retenciones de auditoría.
 */
export interface AuditHoldRepository {
  /**
   * Registra una nueva retención de auditoría.
   *
   * Se permiten múltiples retenciones sobre el mismo alcance: la retención es acumulativa
   * (basta una vigente para impedir la purga), no un estado único.
   */
  create(input: CreateAuditHoldInput): Promise<AuditHoldRecord>;

  /**
   * Libera una retención de auditoría de forma atómica.
   *
   * La implementación debe actualizar únicamente la fila que:
   * - pertenece al `tenantId` indicado, y
   * - sigue vigente (`releasedAt IS NULL`).
   *
   * Si la fila ya fue liberada, no debe sobrescribir `releasedAt` ni `releasedByUserId`
   * originales; en su lugar devuelve `ALREADY_RELEASED`, lo que permite al caso de uso
   * rechazar la segunda liberación sin condición de carrera.
   *
   * El instante de liberación lo asigna la **base de datos** —no el reloj de la aplicación—,
   * de modo que la restricción `releasedAt >= createdAt` se evalúe con un único reloj y no
   * dependa de la deriva entre servidores.
   *
   * @param tenantId - ID del tenant para aislamiento de datos.
   * @param holdId - ID de la retención.
   * @param releasedByUserId - ID del actor autenticado que autoriza la liberación.
   * @returns `NOT_FOUND` si la retención no existe o pertenece a otro tenant;
   *          `ALREADY_RELEASED` si ya estaba liberada; `RELEASED` con el registro actualizado.
   */
  release(
    tenantId: number,
    holdId: number,
    releasedByUserId: number,
  ): Promise<ReleaseAuditHoldOutcome>;

  /**
   * Consulta de autorización previa a la purga: determina si el evento indicado está
   * protegido en la fecha `at`.
   *
   * Devuelve `true` si existe al menos una retención vigente cuyo alcance cubra
   * **el tenant**, **la afiliación** o **el evento** consultados. Una retención está
   * vigente cuando:
   * - no tiene `releasedAt`, y
   * - no tiene `expiresAt`, o `expiresAt` es estrictamente posterior a `at`.
   *
   * Una retención liberada o expirada no bloquea la purga. La comparación de expiración
   * es estricta: si `expiresAt` es exactamente igual a `at`, la retención ya no está vigente.
   *
   * @param tenantId - ID del tenant.
   * @param affiliationId - ID de la afiliación del evento.
   * @param auditEventId - ID del evento de auditoría.
   * @param at - Fecha/hora de evaluación de vigencia.
   */
  isEventOnHold(
    tenantId: number,
    affiliationId: number,
    auditEventId: number,
    at: Date,
  ): Promise<boolean>;
}
