/// ARCHIVO: tests/profiles/profiles-eligibility-service.unit.test.ts
/// Verifica que el contrato transaccional de Profiles exigido por Catalog
/// (Finding 2) no degrade silenciosamente al cliente Prisma global.

import { describe, expect, it, vi } from "vitest";
import { PrismaProfilesEligibilityService } from "@/modules/profiles/infrastructure/prisma/prisma-profiles-eligibility-service";
import { TransactionContext } from "@/shared/types/transaction-context";
import {
  createPrismaTransactionContext,
  InvalidTransactionContextError,
} from "@/shared/database/prisma-transaction-context";

const missingContext = undefined as unknown as TransactionContext;

describe("PrismaProfilesEligibilityService — contrato transaccional estricto (P2 - Finding 2)", () => {
  it("lockProfileForUpdate rechaza un contexto ausente en lugar de caer al cliente global", async () => {
    const service = new PrismaProfilesEligibilityService();

    await expect(
      service.lockProfileForUpdate(10, missingContext)
    ).rejects.toThrow(InvalidTransactionContextError);
  });

  it("suspendOnSpecialtyRevoked rechaza un contexto ausente en lugar de caer al cliente global", async () => {
    const service = new PrismaProfilesEligibilityService();

    await expect(
      service.suspendOnSpecialtyRevoked(10, missingContext)
    ).rejects.toThrow(InvalidTransactionContextError);
  });

  it("lockProfileForUpdate rechaza un contexto impostor (no sellado)", async () => {
    const service = new PrismaProfilesEligibilityService();

    await expect(
      service.lockProfileForUpdate(10, { fake: true } as unknown as TransactionContext)
    ).rejects.toThrow(InvalidTransactionContextError);
  });

  it("lockProfileForUpdate ejecuta el FOR UPDATE sobre el cliente transaccional del contexto", async () => {
    const $queryRaw = vi.fn().mockResolvedValue([{ id: 10 }]);
    const txClient = { $queryRaw } as unknown;
    const txContext = createPrismaTransactionContext(txClient as never);

    const service = new PrismaProfilesEligibilityService();
    await service.lockProfileForUpdate(10, txContext);

    expect($queryRaw).toHaveBeenCalledTimes(1);
  });
});
