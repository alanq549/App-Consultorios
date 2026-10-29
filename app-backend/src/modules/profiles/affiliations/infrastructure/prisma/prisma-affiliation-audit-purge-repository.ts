/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-audit-purge-repository.ts
/// Implementación basada en Prisma del puerto AffiliationAuditPurgeRepository (C2).
///
/// Propósito: Ejecutar la purga física de eventos de auditoría vencidos respetando, en la
/// misma sentencia SQL, la protección de las retenciones (Audit Hold) vigentes.
///
/// Nota de semántica de retención:
/// La comprobación de protección replica exactamente la de `isEventOnHold` y se expresa como
/// un `NOT EXISTS` sobre `ProfessionalAffiliationAuditHold`. Se evalúa en la base de datos
/// —y no en la aplicación— para que el conteo y el borrado compartan el mismo predicado y no
/// exista una ventana en la que un hold creado entre ambas consultas sea ignorado: si un hold
/// vigente protege el evento, el `DELETE` simplemente no lo selecciona.
///
/// Nota de alcance:
/// La purga es por tenant y por lote. La cláusula `IN (SELECT … LIMIT …)` acota el trabajo por
/// ejecución; repetirla drena el remanente de forma idempotente.

import { Prisma } from "@prisma/client";

import type {
  AffiliationAuditPurgeRepository,
  PurgeAuditEventsInput,
} from "../../application/ports/affiliation-audit-purge-repository";

/// Fila del conteo crudo.
type CountRow = { count: bigint };

/**
 * Repositorio de infraestructura para la purga de auditoría vencida.
 */
export class PrismaAffiliationAuditPurgeRepository
  implements AffiliationAuditPurgeRepository
{
  constructor(
    /// Cliente de transacción local inyectado por el Unit of Work o el cliente global.
    private readonly tx: Prisma.TransactionClient,
  ) {}

  /// Cuenta los eventos elegibles para purga (vencidos y sin retención vigente).
  async countPurgeable(input: PurgeAuditEventsInput): Promise<number> {
    const rows = await this.tx.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "ProfessionalAffiliationAuditEvent" AS e
      WHERE e."tenantId" = ${input.tenantId}
        AND e."createdAt" < ${input.createdBefore}
        AND ${this.activeHoldProtection(input.at)}
    `;

    return Number(rows[0]?.count ?? 0n);
  }

  /// Elimina físicamente los eventos elegibles, hasta el límite del lote.
  async purge(input: PurgeAuditEventsInput): Promise<number> {
    const affected = await this.tx.$executeRaw`
      DELETE FROM "ProfessionalAffiliationAuditEvent"
      WHERE "id" IN (
        SELECT e."id"
        FROM "ProfessionalAffiliationAuditEvent" AS e
        WHERE e."tenantId" = ${input.tenantId}
          AND e."createdAt" < ${input.createdBefore}
          AND ${this.activeHoldProtection(input.at)}
        ORDER BY e."id"
        LIMIT (${input.limit})::int
      )
    `;

    return affected;
  }

  /// Predicado `NOT EXISTS`: el evento no está cubierto por ninguna retención vigente.
  ///
  /// Una retención protege si pertenece al mismo tenant, no fue liberada (`releasedAt IS NULL`)
  /// y no expiró (`expiresAt` nulo o estrictamente posterior a `at`); y su alcance es el tenant
  /// completo, la afiliación del evento o el evento mismo.
  private activeHoldProtection(at: Date): Prisma.Sql {
    return Prisma.sql`
      NOT EXISTS (
        SELECT 1
        FROM "ProfessionalAffiliationAuditHold" AS h
        WHERE h."tenantId" = e."tenantId"
          AND h."releasedAt" IS NULL
          AND (h."expiresAt" IS NULL OR h."expiresAt" > ${at})
          AND (
            (h."affiliationId" IS NULL AND h."auditEventId" IS NULL)
            OR (h."affiliationId" = e."affiliationId" AND h."auditEventId" IS NULL)
            OR (h."auditEventId" = e."id")
          )
      )
    `;
  }
}
