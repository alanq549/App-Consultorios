/// ARCHIVO: tests/catalog/professional-specialty-quota-concurrency.integration.test.ts
/// Prueba de integración contra PostgreSQL que demuestra que el bloqueo pesimista
/// (SELECT ... FOR UPDATE) sobre ProfessionalProfile serializa solicitudes concurrentes
/// de especialidad y hace fallar a la segunda al alcanzarse la cuota (Misión 2 - Finding 3).
///
/// A diferencia de la prueba unitaria (que usa un runner y un lock simulados en memoria),
/// esta prueba ejercita el cliente transaccional real, el row-level lock del motor y el
/// conteo real de pendientes.

import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/shared/database/prisma";
import { PrismaSpecialtyRepository } from "@/modules/catalog/infrastructure/prisma/prisma-specialty-repository";
import { PrismaProfessionalSpecialtyRepository } from "@/modules/catalog/infrastructure/prisma/prisma-professional-specialty-repository";
import { PrismaTransactionRunner } from "@/modules/catalog/infrastructure/prisma/prisma-transaction-context";
import { PrismaProfilesEligibilityService } from "@/modules/profiles/infrastructure/prisma/prisma-profiles-eligibility-service";
import { RequestProfessionalSpecialtyUseCase } from "@/modules/catalog/application/use-cases/request-professional-specialty.use-case";
import { CatalogNotificationPort } from "@/modules/catalog/application/ports/catalog-notification.port";
import { MaxPendingSpecialtiesExceededError } from "@/modules/catalog/domain/catalog-errors";

const SUITE_TIMEOUT_MS = 30_000;
const LOCK_DETECTION_TIMEOUT_MS = 3_000;

describe("Integración Catalog–Profiles: cuota de especialidades bajo concurrencia (PostgreSQL)", () => {
  const specialtyRepo = new PrismaSpecialtyRepository();
  const professionalSpecialtyRepo = new PrismaProfessionalSpecialtyRepository();
  const eligibilityService = new PrismaProfilesEligibilityService();
  const transactionRunner = new PrismaTransactionRunner();

  const notificationPort: CatalogNotificationPort = {
    notifySpecialtyRequested: vi.fn().mockResolvedValue(undefined),
    notifySpecialtyApproved: vi.fn().mockResolvedValue(undefined),
    notifySpecialtyRejected: vi.fn().mockResolvedValue(undefined),
    notifyProfileSuspended: vi.fn().mockResolvedValue(undefined),
  };

  const useCase = new RequestProfessionalSpecialtyUseCase(
    specialtyRepo,
    professionalSpecialtyRepo,
    eligibilityService,
    notificationPort,
    transactionRunner
  );

  const createdUserIds: number[] = [];
  const createdSpecialtyIds: number[] = [];

  afterAll(async () => {
    // ProfessionalProfile y ProfessionalSpecialty se eliminan por CASCADE al eliminar User
    if (createdUserIds.length > 0) {
      await prisma.user
        .deleteMany({ where: { id: { in: createdUserIds } } })
        .catch(() => {});
    }
    if (createdSpecialtyIds.length > 0) {
      await prisma.specialty
        .deleteMany({ where: { id: { in: createdSpecialtyIds } } })
        .catch(() => {});
    }
  });

  async function createTestProfessional(): Promise<number> {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const user = await prisma.user.create({
      data: {
        email: `catalog-quota-${unique}@test.invalid`,
        password: "hashedpassword123",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    const profile = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        name: `Dr. Cuota ${unique}`,
        lastName: "Concurrencia",
        description: "Bio de prueba para cuota de especialidades bajo concurrencia",
      },
      select: { id: true },
    });

    return profile.id;
  }

  async function createTestSpecialty(): Promise<number> {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const specialty = await prisma.specialty.create({
      data: {
        name: `Especialidad Cuota ${unique}`,
        description: "Especialidad para prueba concurrente de cuota",
        isActive: true,
      },
      select: { id: true },
    });
    createdSpecialtyIds.push(specialty.id);
    return specialty.id;
  }

  it(
    "serializa dos solicitudes concurrentes con SELECT ... FOR UPDATE y rechaza la segunda por cuota excedida",
    async () => {
      const professionalId = await createTestProfessional();
      const specialtyA = await createTestSpecialty();
      const specialtyB = await createTestSpecialty();
      const alreadyPending = await createTestSpecialty();

      // El profesional ya tiene 1 solicitud PENDING => solo queda 1 cupo disponible
      await prisma.professionalSpecialty.create({
        data: { professionalId, specialtyId: alreadyPending, status: "PENDING" },
      });

      let signalLockAcquired: () => void = () => {};
      const lockAcquired = new Promise<void>((resolve) => {
        signalLockAcquired = resolve;
      });

      let signalRelease: () => void = () => {};
      let released = false;
      const canRelease = new Promise<void>((resolve) => {
        signalRelease = () => {
          if (!released) {
            released = true;
            resolve();
          }
        };
      });

      let holderPid = 0;

      // Transacción retenedora: adquiere el row lock FOR UPDATE sobre el perfil y lo mantiene
      const holderPromise = prisma.$transaction(
        async (tx) => {
          const [{ pid }] =
            await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
          holderPid = pid;

          const rows = await tx.$queryRaw<Array<{ id: number }>>`
            SELECT id FROM "ProfessionalProfile" WHERE id = ${professionalId} FOR UPDATE
          `;
          expect(rows.length).toBe(1);

          signalLockAcquired();
          await canRelease;
        },
        { timeout: 25_000, maxWait: 10_000 }
      );

      try {
        await Promise.race([
          lockAcquired,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error("Timeout esperando la adquisición del lock del perfil")
                ),
              5_000
            )
          ),
        ]);

        // Dos solicitudes concurrentes: ambas quedan bloqueadas en el FOR UPDATE
        const resultsPromise = Promise.allSettled([
          useCase.execute({ professionalId, specialtyId: specialtyA }),
          useCase.execute({ professionalId, specialtyId: specialtyB }),
        ]);

        // Verificar en el motor PostgreSQL que una sesión competidora está bloqueada por el holder
        let blockedDetected = false;
        const deadline = Date.now() + LOCK_DETECTION_TIMEOUT_MS;
        while (Date.now() < deadline) {
          const waiting = await prisma.$queryRaw<Array<{ pid: number }>>`
            SELECT pid
            FROM pg_stat_activity
            WHERE ${holderPid} = ANY(pg_blocking_pids(pid))
              AND query ILIKE '%ProfessionalProfile%'
              AND query ILIKE '%FOR UPDATE%'
          `;
          if (waiting.length > 0) {
            blockedDetected = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }

        expect(blockedDetected).toBe(true);

        // Liberar el lock: las solicitudes se serializan y solo una puede consumir el cupo
        signalRelease();

        const results = await resultsPromise;
        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
          MaxPendingSpecialtiesExceededError
        );

        // El conteo final de pendientes no supera la cuota (1 previa + 1 nueva)
        const pending = await prisma.professionalSpecialty.count({
          where: { professionalId, status: "PENDING" },
        });
        expect(pending).toBe(2);
      } finally {
        signalRelease();
        await holderPromise.catch(() => {});
      }
    },
    SUITE_TIMEOUT_MS
  );
});
