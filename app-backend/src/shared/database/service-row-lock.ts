/// ARCHIVO: src/shared/database/service-row-lock.ts
/// Bloqueo pesimista de la fila de una oferta (`Service`) con `SELECT ... FOR UPDATE`.
///
/// Es el punto de serialización compartido por Catalog y Appointments en la regla D5: Catalog
/// (Misión 4) lo adquiere antes de contar citas y modificar/desactivar la oferta; Appointments lo
/// adquiere antes de leer la oferta y crear la cita. Al tomar el mismo lock de fila, una reserva
/// concurrente no puede colarse entre la comprobación de citas y la mutación, ni usar términos
/// (duración/precio) leídos antes de que Catalog los cambie.
///
/// Debe invocarse SIEMPRE dentro de una transacción: fuera de ella el lock se libera al terminar
/// la sentencia y no protege nada, por eso la firma exige un `TransactionContext` y rechaza el
/// fallback silencioso al cliente Prisma global.

import { TransactionContext } from "@/shared/types/transaction-context";
import {
  extractPrismaClientFromContext,
  InvalidTransactionContextError,
} from "./prisma-transaction-context";

export async function lockServiceRowForUpdate(
  serviceId: number,
  txContext: TransactionContext | undefined,
): Promise<void> {
  if (!txContext) {
    throw new InvalidTransactionContextError(
      "[Database] lockServiceRowForUpdate requiere un TransactionContext activo. " +
        "Se rechazó el fallback al cliente Prisma global para no ejecutar el lock fuera de la transacción prevista.",
    );
  }

  const db = extractPrismaClientFromContext(txContext);
  await db.$queryRaw`
    SELECT id FROM "Service" WHERE id = ${serviceId} FOR UPDATE
  `;
}
