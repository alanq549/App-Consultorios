/// ARCHIVO: src/shared/database/prisma-transaction-context.ts
/// Transversal de infraestructura compartida para transacciones Prisma (shared/database).
///
/// Propósito: Proporcionar la adaptación de Prisma.TransactionClient a la abstracción
/// única compartida `TransactionContext` (`@/shared/types/transaction-context`),
/// permitiendo a cualquier módulo participar en transacciones sin acoplamiento de persistencia.

import prisma from "./prisma";
import { Prisma } from "@prisma/client";
import { TransactionContext } from "@/shared/types/transaction-context";

export type { TransactionContext } from "@/shared/types/transaction-context";

// Símbolo privado del transversal: solo este archivo puede leer o escribir esta clave sellada.
const TX_CLIENT = Symbol("shared.prisma.tx");

/** Contenedor interno sellado. */
interface PrismaTransactionBag {
  [TX_CLIENT]: Prisma.TransactionClient;
}

/** Error lanzado cuando se recibe un TransactionContext desconocido o inválido. */
export class InvalidTransactionContextError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "[Database] Se recibió un TransactionContext no creado por createPrismaTransactionContext. " +
        "La operación se canceló para evitar que una escritura quede fuera de la transacción prevista.",
    );
    this.name = "InvalidTransactionContextError";
  }
}

/**
 * Envuelve un Prisma.TransactionClient en la abstracción compartida TransactionContext.
 * Transversal común para que cualquier módulo con una transacción Prisma activa
 * pueda pasarla a través de contratos agnósticos sin acoplar infraestructura.
 */
export function createPrismaTransactionContext(
  tx: Prisma.TransactionClient,
): TransactionContext {
  const bag: PrismaTransactionBag = { [TX_CLIENT]: tx };
  return bag as unknown as TransactionContext;
}

/**
 * Extrae el Prisma.TransactionClient de un TransactionContext.
 * - Sin contexto (undefined/null) → devuelve el cliente global prisma (operación no transaccional).
 * - Contexto válido (creado por createPrismaTransactionContext) → devuelve el tx client.
 * - Contexto extraño/impostor → lanza InvalidTransactionContextError.
 */
export function extractPrismaClientFromContext(
  txContext?: TransactionContext,
): typeof prisma | Prisma.TransactionClient {
  if (txContext === undefined || txContext === null) {
    return prisma;
  }

  const bag = txContext as unknown as Partial<PrismaTransactionBag>;
  const txClient = bag[TX_CLIENT];

  if (txClient === undefined) {
    throw new InvalidTransactionContextError();
  }

  return txClient;
}
