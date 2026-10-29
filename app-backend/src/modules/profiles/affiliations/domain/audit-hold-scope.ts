/// ARCHIVO: src/modules/profiles/affiliations/domain/audit-hold-scope.ts
///
/// Propósito: Definir el alcance válido de una retención de auditoría (Audit Hold) y
/// resolverlo a partir de los identificadores suministrados.
///
/// Reglas del alcance (no expresables con `CHECK` cuando cruzan tablas):
///
/// | affiliationId | auditEventId | Alcance                                  |
/// |---------------|--------------|------------------------------------------|
/// | null          | null         | Todo el tenant                           |
/// | ID            | null         | Toda la auditoría de esa afiliación      |
/// | ID            | ID           | Un evento específico                     |
/// | null          | ID           | Inválido                                 |
///
/// Un evento específico siempre exige declarar su afiliación; de lo contrario no puede
/// verificarse la invariante `event.affiliationId == hold.affiliationId`.

/**
 * Alcance resuelto y normalizado de una retención de auditoría.
 * El tipo discriminado garantiza en tiempo de compilación que un alcance de evento
 * siempre lleva una afiliación asociada.
 */
export type ResolvedAuditHoldScope =
  | { kind: "TENANT"; affiliationId: null; auditEventId: null }
  | { kind: "AFFILIATION"; affiliationId: number; auditEventId: null }
  | { kind: "EVENT"; affiliationId: number; auditEventId: number };

/**
 * Resuelve el alcance de una retención a partir de los identificadores solicitados.
 *
 * @param affiliationId - ID de la afiliación, o `null` para abarcar todo el tenant.
 * @param auditEventId - ID del evento de auditoría, o `null` para abarcar el alcance de la afiliación/tenant.
 * @returns El alcance normalizado, o `null` si la combinación es inválida
 *          (`auditEventId` sin `affiliationId`).
 */
export function resolveAuditHoldScope(
  affiliationId: number | null,
  auditEventId: number | null,
): ResolvedAuditHoldScope | null {
  if (auditEventId === null) {
    return affiliationId === null
      ? { kind: "TENANT", affiliationId: null, auditEventId: null }
      : { kind: "AFFILIATION", affiliationId, auditEventId: null };
  }

  if (affiliationId === null) {
    return null;
  }

  return { kind: "EVENT", affiliationId, auditEventId };
}
