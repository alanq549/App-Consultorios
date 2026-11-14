/// ARCHIVO: src/shared/types/transaction-context.ts
/// Abstracción compartida de contexto transaccional para operaciones atómicas.
/// Mantiene los puertos, repositorios y casos de uso desacoplados de clientes específicos de base de datos.

export interface TransactionContext {
  readonly transactionId?: string;
  readonly [key: string]: unknown;
}

export interface TransactionRunner {
  run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}


