/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-audit-hold-repository.ts
/// Implementación basada en Prisma del puerto AuditHoldRepository.
///
/// Propósito: Persistir las retenciones de auditoría (Audit Hold) que suspenden la purga
/// física de eventos y resolver la consulta de autorización previa a la purga.
///
/// Nota de concurrencia:
/// La liberación se implementa como una **actualización condicional** (`UPDATE … WHERE
/// releasedAt IS NULL`). Bajo READ COMMITTED, la segunda solicitud concurrente queda
/// bloqueada por el `UPDATE` de la primera, vuelve a evaluar la condición sobre la fila ya
/// confirmada, no coincide y actualiza 0 filas. Así sólo una liberación es efectiva y la
/// fecha y el actor originales nunca se sobrescriben.
///
/// Nota de reloj:
/// La restricción `releasedAt >= createdAt` sólo es segura si **ambos sellos los asigna
/// PostgreSQL**. La liberación fija `releasedAt` con `statement_timestamp()` (la hora de la
/// sentencia `UPDATE`) y la creación omite `createdAt` en un `INSERT` explícito para que actúe
/// el `DEFAULT CURRENT_TIMESTAMP` de la tabla. No basta con `@default(now())` en el esquema:
/// Prisma resuelve `now()` en el **cliente** (reloj del proceso Node), y la deriva entre ese
/// reloj y el de la base puede colocar `releasedAt` antes de `createdAt` y violar el `CHECK`.
/// Se usa `statement_timestamp()` y no `CURRENT_TIMESTAMP` en la liberación: este último
/// devuelve la hora de **inicio de la transacción**, que en una transacción larga puede ser
/// anterior al `createdAt` de la retención.
/// `updatedAt` no tiene `DEFAULT` en base (Prisma lo resuelve con `@updatedAt`), así que las
/// sentencias explícitas lo asignan también con `statement_timestamp()`.

import type { Prisma } from "@prisma/client";

import type {
  AuditHoldRecord,
  AuditHoldRepository,
  CreateAuditHoldInput,
  ReleaseAuditHoldOutcome,
} from "../../application/ports/affiliation-audit-hold-repository";

/// Fila del modelo Prisma de retenciones de auditoría tal como la devuelve la base de datos.
type AuditHoldRow =
  Prisma.ProfessionalAffiliationAuditHoldGetPayload<Record<string, never>>;

/**
 * Repositorio de infraestructura para retenciones de auditoría.
 */
export class PrismaAffiliationAuditHoldRepository implements AuditHoldRepository {
  constructor(
    /// Cliente de transacción local inyectado por el Unit of Work.
    private readonly tx: Prisma.TransactionClient,
  ) {}

  /// Registra una nueva retención de auditoría. El alcance ya viene validado por el caso de uso.
  ///
  /// `INSERT` explícito que **omite `createdAt`**: deja que la base asigne el sello con su
  /// `DEFAULT CURRENT_TIMESTAMP`, de modo que `createdAt` y el `releasedAt` de `release()`
  /// (ambos en PostgreSQL) compartan reloj y el `CHECK releasedAt >= createdAt` no dependa de
  /// la deriva entre la aplicación y la base. `updatedAt` se asigna en la misma sentencia.
  async create(input: CreateAuditHoldInput): Promise<AuditHoldRecord> {
    const rows = await this.tx.$queryRaw<AuditHoldRow[]>`
      INSERT INTO "ProfessionalAffiliationAuditHold" (
        "tenantId", "affiliationId", "auditEventId", "reason",
        "requestedByUserId", "expiresAt", "updatedAt"
      )
      VALUES (
        ${input.tenantId}, ${input.affiliationId}, ${input.auditEventId}, ${input.reason},
        ${input.requestedByUserId}, ${input.expiresAt}, statement_timestamp()
      )
      RETURNING *
    `;

    return this.toRecord(rows[0]);
  }

  /// Libera una retención de auditoría de forma atómica y condicional.
  async release(
    tenantId: number,
    holdId: number,
    releasedByUserId: number,
  ): Promise<ReleaseAuditHoldOutcome> {
    // Actualización condicional: sólo afecta a una retención vigente (`releasedAt IS NULL`)
    // del tenant indicado. El instante lo asigna la base de datos (`statement_timestamp()`,
    // la hora de esta sentencia) y no la aplicación, para que `releasedAt >= createdAt` use
    // el mismo reloj. Se evita `CURRENT_TIMESTAMP` porque devuelve la hora de inicio de la
    // transacción y podría ser anterior a `createdAt` en una transacción larga. Si ya fue
    // liberada, no se afecta ninguna fila y no se sobrescribe la liberación original.
    const affected = await this.tx.$executeRaw`
      UPDATE "ProfessionalAffiliationAuditHold"
      SET "releasedAt" = statement_timestamp(),
          "releasedByUserId" = ${releasedByUserId},
          "updatedAt" = statement_timestamp()
      WHERE "id" = ${holdId}
        AND "tenantId" = ${tenantId}
        AND "releasedAt" IS NULL
    `;

    const record = await this.tx.professionalAffiliationAuditHold.findFirst({
      where: { id: holdId, tenantId },
    });

    // Sin coincidencia por tenant: la retención no existe o pertenece a otro tenant.
    if (!record) {
      return { outcome: "NOT_FOUND" };
    }

    // Se actualizó exactamente una fila: la liberación es efectiva.
    if (affected === 1) {
      return { outcome: "RELEASED", hold: this.toRecord(record) };
    }

    // La fila existe pero ya estaba liberada: se conserva la liberación original.
    return { outcome: "ALREADY_RELEASED", hold: this.toRecord(record) };
  }

  /// Consulta de autorización previa a la purga: determina si el evento está protegido en `at`.
  async isEventOnHold(
    tenantId: number,
    affiliationId: number,
    auditEventId: number,
    at: Date,
  ): Promise<boolean> {
    const record = await this.tx.professionalAffiliationAuditHold.findFirst({
      where: {
        tenantId,
        releasedAt: null,
        AND: [
          // Vigente: sin expiración, o expiración estrictamente posterior a `at`.
          // La comparación es estricta: `expiresAt == at` ya no está vigente.
          { OR: [{ expiresAt: null }, { expiresAt: { gt: at } }] },
          // Alcance aplicable: el tenant completo, la afiliación del evento o el evento mismo.
          {
            OR: [
              { affiliationId: null, auditEventId: null },
              { affiliationId, auditEventId: null },
              { affiliationId, auditEventId },
            ],
          },
        ],
      },
      select: { id: true },
    });

    return record !== null;
  }

  /// Mapea un registro persistido al tipo de retorno del puerto.
  private toRecord(record: AuditHoldRow): AuditHoldRecord {
    return {
      id: record.id,
      tenantId: record.tenantId,
      affiliationId: record.affiliationId,
      auditEventId: record.auditEventId,
      reason: record.reason,
      requestedByUserId: record.requestedByUserId,
      expiresAt: record.expiresAt,
      releasedAt: record.releasedAt,
      releasedByUserId: record.releasedByUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
