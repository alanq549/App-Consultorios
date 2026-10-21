/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-audit-repository.ts
/// Implementación basada en Prisma del puerto AffiliationAuditRepository.
///
/// Propósito: Proveer una persistencia append-only de eventos de auditoría para la trazabilidad de afiliaciones.
/// Transforma de manera segura los datos JSON (`changedFields`) y opera dentro del cliente de transacción (`Prisma.TransactionClient`)
/// para garantizar que la auditoría quede registrada en la misma transacción que los cambios de negocio.

import { Prisma } from "@prisma/client";

import type {
  AffiliationAuditEventInput,
  AffiliationAuditEventRecord,
  AffiliationAuditRepository,
  JsonObject
} from "../../application/ports/affiliation-audit-repository";

/**
 * Repositorio de infraestructura para la insersión inmutable (append-only)
 * de eventos de auditoría sobre afiliaciones.
 */
export class PrismaAffiliationAuditRepository
  implements AffiliationAuditRepository {
  constructor(
    /// Cliente de transacción local inyectado por el Unit of Work.
    private readonly tx: Prisma.TransactionClient,
  ) { }

  /// Registra e inserta de forma inmutable un nuevo evento de auditoría en la base de datos.
  /// Mapea de forma transparente tipos complejos como campos JSON (`changedFields`) utilizando los primitivos de Prisma (`Prisma.DbNull`).
  ///
  /// @param input Datos del evento a auditar.
  /// @returns Registro de auditoría persistido con ID y marcas de tiempo generadas.
  async append(
    input: AffiliationAuditEventInput,
  ): Promise<AffiliationAuditEventRecord> {
    // Inserta el nuevo registro de auditoría en la base de datos dentro de la transacción activa.
    const record = await this.tx.professionalAffiliationAuditEvent.create({
      data: {
        tenantId: input.tenantId,
        affiliationId: input.affiliationId,
        action: input.action,
        actorUserId: input.actorUserId,
        revisionId: input.revisionId ?? null,
        previousStatus: input.previousStatus ?? null,
        nextStatus: input.nextStatus ?? null,
        reason: input.reason ?? null,
        // Manejo seguro del campo JSON: si es nulo o indefinido se asigna explicitamente Prisma.DbNull
        changedFields:
          input.changedFields == null
            ? Prisma.DbNull
            : (input.changedFields as Prisma.InputJsonObject),
        sourceReference: input.sourceReference ?? null,
        ...(input.occurredAt !== undefined && {
          occurredAt: input.occurredAt,
        }),
      },
    });

    // Mapeo del registro persistido en la base de datos al tipo de retorno del puerto (AffiliationAuditEventRecord).
    return {
      id: record.id,
      tenantId: record.tenantId,
      affiliationId: record.affiliationId,
      action: record.action,
      actorUserId: record.actorUserId,
      revisionId: record.revisionId,
      previousStatus: record.previousStatus,
      nextStatus: record.nextStatus,
      reason: record.reason,
      // Validación y conversión segura del campo JSON retornado por la base de datos a un objeto Record<string, unknown>
      changedFields:
        record.changedFields === null ||
          typeof record.changedFields !== "object" ||
          Array.isArray(record.changedFields)
          ? null
          : (record.changedFields as JsonObject),
      sourceReference: record.sourceReference,
      occurredAt: record.occurredAt,
      createdAt: record.createdAt,
    };
  }
}