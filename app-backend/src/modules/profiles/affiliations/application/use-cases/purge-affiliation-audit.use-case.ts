/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/purge-affiliation-audit.use-case.ts
/// Caso de uso C2: purga controlada de auditoría de afiliaciones vencida por retención.
///
/// Reglas aplicadas:
/// - La retención por defecto es de 24 meses desde `createdAt` (política de portafolio).
/// - La purga es una operación de mantenimiento explícita: no hay cron automático. El operador
///   la invoca por tenant y decide si ejecutar en seco (`dryRun`) o aplicar los cambios.
/// - Es idempotente: repetir la ejecución sólo elimina lo que siga siendo elegible.
/// - Nunca elimina eventos protegidos por una retención vigente: esa decisión la garantiza el
///   repositorio, que evalúa los holds con la misma semántica que `isEventOnHold`.
/// - Los instantes (`now`) y el lote (`batchSize`) son inyectables para que la operación sea
///   determinista y observable.

import { InvalidRetentionPolicyError } from "../../domain/affiliation-errors";
import type { AffiliationAuditPurgeRepository } from "../ports/affiliation-audit-purge-repository";

/// Plazo de retención de auditoría por defecto, en meses desde `createdAt`.
export const AUDIT_RETENTION_MONTHS = 24;

/// Tamaño de lote por defecto: acota la duración de una ejecución.
export const DEFAULT_PURGE_BATCH_SIZE = 500;

/**
 * Datos de entrada de la purga.
 *
 * Todos los campos salvo `tenantId` son opcionales y tienen un valor por defecto seguro.
 */
export interface PurgeAffiliationAuditInput {
  /// Tenant sobre el que se ejecuta la purga.
  tenantId: number;
  /// Plazo de retención en meses. Por defecto `AUDIT_RETENTION_MONTHS` (24).
  retentionMonths?: number;
  /// Instante de referencia para calcular el corte y evaluar la vigencia de los holds.
  /// Por defecto, el momento de la ejecución.
  now?: Date;
  /// Máximo de eventos a eliminar en esta ejecución. Por defecto `DEFAULT_PURGE_BATCH_SIZE`.
  batchSize?: number;
  /// Si es `true`, sólo cuenta los eventos elegibles sin eliminarlos.
  dryRun?: boolean;
}

export interface PurgeAffiliationAuditOutput {
  tenantId: number;
  /// Instante de evaluación (`now`).
  evaluatedAt: Date;
  /// Corte de retención: se purgan eventos con `createdAt` estrictamente anterior.
  cutoff: Date;
  retentionMonths: number;
  dryRun: boolean;
  /// Eventos vencidos y no protegidos por una retención vigente, al momento de evaluar.
  purgeable: number;
  /// Eventos realmente eliminados en esta ejecución (`0` en dry-run).
  purged: number;
}

/**
 * Resta meses a una fecha manteniendo la hora UTC.
 */
function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

/**
 * Caso de uso de purga física de auditoría vencida.
 */
export class PurgeAffiliationAuditUseCase {
  constructor(private readonly purgeRepository: AffiliationAuditPurgeRepository) {}

  async execute(
    input: PurgeAffiliationAuditInput,
  ): Promise<PurgeAffiliationAuditOutput> {
    // 1. Validación de la política antes de tocar la base de datos: una política inválida
    //    (plazo o lote no positivos) podría eliminar auditoría sin respetar la retención.
    const retentionMonths = input.retentionMonths ?? AUDIT_RETENTION_MONTHS;
    if (!Number.isInteger(retentionMonths) || retentionMonths <= 0) {
      throw new InvalidRetentionPolicyError(
        `El plazo de retención debe ser un entero positivo de meses (recibido: ${retentionMonths})`,
      );
    }

    const batchSize = input.batchSize ?? DEFAULT_PURGE_BATCH_SIZE;
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new InvalidRetentionPolicyError(
        `El tamaño de lote debe ser un entero positivo (recibido: ${batchSize})`,
      );
    }

    const now = input.now ?? new Date();
    const cutoff = subtractMonths(now, retentionMonths);
    const dryRun = input.dryRun ?? false;

    const purgeInput = {
      tenantId: input.tenantId,
      createdBefore: cutoff,
      at: now,
      limit: batchSize,
    };

    // 2. Conteo previo: reporta el remanente elegible, incluso cuando el lote no lo drena todo.
    const purgeable = await this.purgeRepository.countPurgeable(purgeInput);

    // 3. Aplicación: sólo si no es ejecución en seco.
    const purged = dryRun
      ? 0
      : await this.purgeRepository.purge(purgeInput);

    return {
      tenantId: input.tenantId,
      evaluatedAt: now,
      cutoff,
      retentionMonths,
      dryRun,
      purgeable,
      purged,
    };
  }
}
