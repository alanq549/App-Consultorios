/// ARCHIVO: src/modules/profiles/affiliations/application/ports/affiliation-audit-purge-repository.ts
/// Puerto de salida para la purga física de eventos de auditoría vencidos (C2).
///
/// Propósito: Separar la operación destructiva de retención de auditoría del puerto
/// append-only `AffiliationAuditRepository`. La purga es una operación de mantenimiento
/// controlada e idempotente: elimina únicamente eventos que superaron el plazo de retención
/// y que **no** están protegidos por ninguna retención (Audit Hold) vigente.
///
/// Reglas:
/// - Un evento es elegible si `createdAt` es estrictamente anterior al corte de retención.
/// - Un evento protegido por una retención vigente (tenant, afiliación o evento) nunca se purga.
/// - La purga se ejecuta por tenant y por lote: es idempotente y puede repetirse para drenar
///   el remanente sin efectos adicionales.

/**
 * Parámetros de una operación de purga o de conteo previo.
 *
 * Todos los instantes los decide la capa de aplicación (caso de uso), no el adaptador,
 * para que la evaluación de vigencia y el corte de retención sean deterministas y probables.
 */
export interface PurgeAuditEventsInput {
  /// Tenant sobre el que se ejecuta la purga (aislamiento multi-tenant).
  tenantId: number;
  /// Corte de retención: sólo se consideran eventos con `createdAt` **estrictamente** anterior.
  createdBefore: Date;
  /// Instante de evaluación de la vigencia de las retenciones (para su expiración).
  at: Date;
  /// Máximo de eventos a eliminar en una sola ejecución (control de lote).
  limit: number;
}

/**
 * Contrato del repositorio de purga física de eventos de auditoría.
 *
 * La implementación debe evaluar la protección de retenciones con la **misma** semántica
 * que `AuditHoldRepository.isEventOnHold`: una retención vigente cubre el tenant completo,
 * la afiliación del evento o el evento mismo, y una retención liberada o expirada no protege.
 */
export interface AffiliationAuditPurgeRepository {
  /**
   * Cuenta los eventos elegibles para purga sin eliminarlos (modo dry-run).
   *
   * @returns Número de eventos vencidos y no protegidos por una retención vigente.
   */
  countPurgeable(input: PurgeAuditEventsInput): Promise<number>;

  /**
   * Elimina físicamente los eventos elegibles para purga, hasta el límite indicado.
   *
   * La operación es idempotente: repetirla sólo elimina lo que siga siendo elegible.
   *
   * @returns Número de eventos realmente eliminados (≤ `input.limit`).
   */
  purge(input: PurgeAuditEventsInput): Promise<number>;
}
