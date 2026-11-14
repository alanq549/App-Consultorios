/// ARCHIVO: tests/catalog/transaction-context.unit.test.ts
/// Verifica que extractPrismaClient rechace explícitamente contextos extraños
/// en lugar de hacer fallback silencioso al cliente global.

import { describe, expect, it, vi } from "vitest";
import {
  createPrismaTransactionContext,
  extractPrismaClient,
  CatalogTransactionError,
} from "@/modules/catalog/infrastructure/prisma/prisma-transaction-context";

describe("extractPrismaClient — comportamiento ante TransactionContext inválido (P1)", () => {
  it("retorna el cliente global cuando no se proporciona contexto (operación normal)", () => {
    const client = extractPrismaClient(undefined);
    // No lanza — devuelve el cliente por defecto
    expect(client).toBeDefined();
  });

  it("lanza CatalogTransactionError ante un contexto no creado por createPrismaTransactionContext", () => {
    // Contexto «fabricado» externamente: tiene la firma de índice pero no el símbolo sellado
    const fakeContext = { someKey: "someValue" } as any;

    expect(() => extractPrismaClient(fakeContext)).toThrowError(CatalogTransactionError);
  });

  it("lanza CatalogTransactionError incluso si el objeto tiene propiedades que parecen un cliente Prisma", () => {
    // Anteriormente el código hacía fallback si encontraba $executeRaw — ya no debe hacerlo
    const impostor = { $executeRaw: () => Promise.resolve(), specialty: {} } as any;

    expect(() => extractPrismaClient(impostor)).toThrowError(CatalogTransactionError);
  });

  it("devuelve el tx client cuando el contexto fue creado por createPrismaTransactionContext", () => {
    // Usamos un objeto stub que simula Prisma.TransactionClient
    const fakeTxClient = { specialty: {}, $executeRaw: vi.fn() } as any;
    const ctx = createPrismaTransactionContext(fakeTxClient);

    const result = extractPrismaClient(ctx);
    expect(result).toBe(fakeTxClient);
  });
});
