/// ARCHIVO: tests/profiles/profiles-affiliations/purge-affiliation-audit.use-case.unit.test.ts
/// Pruebas unitarias de C2: política de retención, ejecución en seco e idempotencia del caso de uso.

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUDIT_RETENTION_MONTHS,
  DEFAULT_PURGE_BATCH_SIZE,
  PurgeAffiliationAuditUseCase,
} from "@/modules/profiles/affiliations/application/use-cases/purge-affiliation-audit.use-case";
import { InvalidRetentionPolicyError } from "@/modules/profiles/affiliations/domain/affiliation-errors";
import type {
  AffiliationAuditPurgeRepository,
  PurgeAuditEventsInput,
} from "@/modules/profiles/affiliations/application/ports/affiliation-audit-purge-repository";

describe("PurgeAffiliationAuditUseCase (C2)", () => {
  let countPurgeable: ReturnType<typeof vi.fn>;
  let purge: ReturnType<typeof vi.fn>;
  let repository: AffiliationAuditPurgeRepository;
  let useCase: PurgeAffiliationAuditUseCase;

  beforeEach(() => {
    countPurgeable = vi.fn();
    purge = vi.fn();
    repository = {
      countPurgeable,
      purge,
    } as unknown as AffiliationAuditPurgeRepository;
    useCase = new PurgeAffiliationAuditUseCase(repository);
  });

  it("aplica la retención por defecto de 24 meses y pasa el corte y el lote al repositorio", async () => {
    countPurgeable.mockResolvedValue(3);
    purge.mockResolvedValue(3);

    const now = new Date("2026-06-15T12:00:00.000Z");
    const result = await useCase.execute({ tenantId: 7, now });

    const expectedInput: PurgeAuditEventsInput = {
      tenantId: 7,
      createdBefore: new Date("2024-06-15T12:00:00.000Z"),
      at: now,
      limit: DEFAULT_PURGE_BATCH_SIZE,
    };

    expect(result.retentionMonths).toBe(AUDIT_RETENTION_MONTHS);
    expect(result.cutoff).toEqual(expectedInput.createdBefore);
    expect(result.dryRun).toBe(false);
    expect(result.purgeable).toBe(3);
    expect(result.purged).toBe(3);
    expect(countPurgeable).toHaveBeenCalledWith(expectedInput);
    expect(purge).toHaveBeenCalledWith(expectedInput);
  });

  it("en ejecución en seco sólo cuenta y no elimina", async () => {
    countPurgeable.mockResolvedValue(5);

    const result = await useCase.execute({
      tenantId: 7,
      now: new Date("2026-06-15T12:00:00.000Z"),
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.purgeable).toBe(5);
    expect(result.purged).toBe(0);
    expect(countPurgeable).toHaveBeenCalledTimes(1);
    expect(purge).not.toHaveBeenCalled();
  });

  it("respeta un plazo de retención y un tamaño de lote personalizados", async () => {
    countPurgeable.mockResolvedValue(100);
    purge.mockResolvedValue(10);

    const now = new Date("2026-06-15T00:00:00.000Z");
    const result = await useCase.execute({
      tenantId: 42,
      retentionMonths: 12,
      batchSize: 10,
      now,
    });

    const expectedInput: PurgeAuditEventsInput = {
      tenantId: 42,
      createdBefore: new Date("2025-06-15T00:00:00.000Z"),
      at: now,
      limit: 10,
    };

    expect(result.retentionMonths).toBe(12);
    expect(result.purgeable).toBe(100);
    // El lote no drena todo el remanente: quedan 90 elegibles para una nueva ejecución.
    expect(result.purged).toBe(10);
    expect(purge).toHaveBeenCalledWith(expectedInput);
  });

  it("es idempotente: repetir la ejecución vuelve a consultar el estado real", async () => {
    countPurgeable.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    purge.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    const now = new Date("2026-06-15T00:00:00.000Z");
    const first = await useCase.execute({ tenantId: 1, now });
    const second = await useCase.execute({ tenantId: 1, now });

    expect(first.purged).toBe(2);
    expect(second.purgeable).toBe(0);
    expect(second.purged).toBe(0);
  });

  it("rechaza un plazo de retención inválido sin tocar el repositorio", async () => {
    for (const retentionMonths of [0, -1, 1.5]) {
      await expect(
        useCase.execute({ tenantId: 1, retentionMonths }),
      ).rejects.toBeInstanceOf(InvalidRetentionPolicyError);
    }

    expect(countPurgeable).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
  });

  it("rechaza un tamaño de lote inválido sin tocar el repositorio", async () => {
    for (const batchSize of [0, -5, 2.5]) {
      await expect(
        useCase.execute({ tenantId: 1, batchSize }),
      ).rejects.toBeInstanceOf(InvalidRetentionPolicyError);
    }

    expect(countPurgeable).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
  });
});
