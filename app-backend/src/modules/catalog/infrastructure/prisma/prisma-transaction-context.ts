/// ARCHIVO: src/modules/catalog/infrastructure/prisma/prisma-transaction-context.ts
/// Adaptador de persistencia de Catalog que utiliza la abstracción transversal
/// compartida en `@/shared/database/prisma-transaction-context`.
///
/// Mantiene la compatibilidad interna del contexto Catalog sin exponer
/// adaptadores de persistencia en la API pública del módulo.

export {
  createPrismaTransactionContext,
  extractPrismaClientFromContext as extractPrismaClient,
  InvalidTransactionContextError as CatalogTransactionError,
} from "@/shared/database/prisma-transaction-context";
