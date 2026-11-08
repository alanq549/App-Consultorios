/// ARCHIVO: tests/profiles/specialty-revocation-concurrency.integration.test.ts
/// Pruebas de integración contra PostgreSQL para verificar el bloqueo pesimista y el control de concurrencia entre Catalog y Profiles (Fase 4 - D5).
///
/// Propósito:
/// 1. Comprobar que SELECT ... FOR UPDATE sobre ProfessionalProfile serializa sesiones concurrentes a nivel de base de datos.
/// 2. Demostrar con pg_blocking_pids que PostgreSQL retiene en espera a transacciones competidoras.
/// 3. Validar mediante coordinación de barreras que la revocación de la última especialidad y una aprobación concurrente
///    se serializan atómicamente, forzando la revalidación del requisito de especialidad aprobada y fallando
///    determinísticamente con ProfileMissingSpecialtyError (evitando perfiles APPROVED sin especialidades).
/// 4. Verificar que estados terminales REJECTED y transitorios PENDING se preservan en BD real tras una revocación.

import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/shared/database/prisma";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";
import { PrismaCatalogSpecialtyChecker } from "@/modules/profiles/infrastructure/prisma/prisma-catalog-specialty-checker";
import { ProfessionalSpecialtyService } from "@/modules/specialty/ProfessionalSpecialty/ProfessionalSpecialty.Service";
import { ProfileMissingSpecialtyError } from "@/modules/profiles/domain/profile-errors";

vi.mock("@/modules/notifications/notifications.service", () => ({
  NotificationService: {
    notifySpecialtyApproved: vi.fn().mockResolvedValue(undefined),
    notifySpecialtyRejected: vi.fn().mockResolvedValue(undefined),
    notifyProfileSuspended: vi.fn().mockResolvedValue(undefined),
  },
}));

const SUITE_TIMEOUT_MS = 25_000;

describe("Integración Catalog–Profiles: Concurrencia y Row-level Locking (PostgreSQL)", () => {
  const repo = new PrismaProfessionalProfileRepository();
  const specialtyChecker = new PrismaCatalogSpecialtyChecker();

  let createdUserIds: number[] = [];
  let createdSpecialtyIds: number[] = [];

  // Helper para crear un usuario profesional con perfil
  async function createTestProfessional(initialStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" = "APPROVED") {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const user = await prisma.user.create({
      data: {
        email: `concurrency-pro-${unique}@test.invalid`,
        password: "hashedpassword123",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    const profile = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        name: `Dr. Concurrency ${unique}`,
        lastName: "Tester",
        description: "Bio de prueba para concurrencia",
        verificationStatus: initialStatus,
      },
      select: { id: true, userId: true, verificationStatus: true },
    });

    return { user, profile };
  }

  // Helper para crear una especialidad
  async function createTestSpecialty() {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const specialty = await prisma.specialty.create({
      data: {
        name: `Especialidad ${unique}`,
        description: "Descripción de especialidad para test concurrente",
        isActive: true,
      },
      select: { id: true, name: true },
    });
    createdSpecialtyIds.push(specialty.id);
    return specialty;
  }

  afterAll(async () => {
    // Limpieza ordenada: borrar especialidades asociadas, perfiles y usuarios de prueba
    if (createdUserIds.length > 0) {
      // ProfessionalProfile y ProfessionalSpecialty se eliminan por CASCADE al eliminar User
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      }).catch(() => {});
    }

    if (createdSpecialtyIds.length > 0) {
      await prisma.specialty.deleteMany({
        where: { id: { in: createdSpecialtyIds } },
      }).catch(() => {});
    }
  });

  it(
    "serializa transiciones concurrentes sobre ProfessionalProfile demostrando bloqueo pesimista en PostgreSQL",
    async () => {
      const { profile } = await createTestProfessional("APPROVED");

      let signalLockAcquired: () => void = () => {};
      const lockAcquired = new Promise<void>((resolve) => {
        signalLockAcquired = resolve;
      });

      let signalProceed: () => void = () => {};
      let proceeded = false;
      const canProceed = new Promise<void>((resolve) => {
        signalProceed = () => {
          if (!proceeded) {
            proceeded = true;
            resolve();
          }
        };
      });

      let holderPid = 0;
      let waiterPromise: Promise<unknown> | null = null;

      // Transacción 1: adquiere el row lock sobre ProfessionalProfile y lo retiene en la barrera
      const holderPromise = prisma.$transaction(async (tx) => {
        const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
        holderPid = pid;

        const rows = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id, "userId", "verificationStatus"
          FROM "ProfessionalProfile"
          WHERE id = ${profile.id}
          FOR UPDATE
        `;
        expect(rows.length).toBe(1);

        // Señalizar que el lock pesimista ya fue adquirido en PostgreSQL
        signalLockAcquired();

        // Esperar en la barrera hasta que la sesión competidora sea detectada bloqueada
        await canProceed;

        return rows[0];
      });

      try {
        // Esperar a que la transacción 1 tenga efectivamente el lock
        let lockTimeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          lockTimeoutHandle = setTimeout(
            () => reject(new Error("Timeout esperando adquisición del lock de perfil profesional")),
            5000
          );
        });

        try {
          await Promise.race([
            lockAcquired,
            timeoutPromise,
            holderPromise.then(() => {
              throw new Error("La transacción de bloqueo terminó antes de señalizar lockAcquired");
            }),
          ]);
        } finally {
          clearTimeout(lockTimeoutHandle!);
        }

        // Transacción 2: intenta ejecutar una transición sobre el mismo perfil mientras Tx1 retiene el lock
        let waiterSettled = false;
        waiterPromise = prisma.$transaction(async (tx) => {
          const rows = await tx.$queryRaw<Array<{ id: number }>>`
            SELECT id, "userId", "verificationStatus"
            FROM "ProfessionalProfile"
            WHERE id = ${profile.id}
            FOR UPDATE
          `;
          return rows;
        })
          .then((res) => {
            waiterSettled = true;
            return res;
          })
          .catch((err) => {
            waiterSettled = true;
            throw err;
          });

        // Sondear pg_stat_activity para verificar que la sesión 2 está bloqueada a nivel de kernel de PostgreSQL por holderPid
        let lockWaitDetected = false;
        const pollDeadline = Date.now() + 5000;
        while (Date.now() < pollDeadline) {
          const waitingSessions = await prisma.$queryRaw<Array<{ pid: number }>>`
            SELECT pid
            FROM pg_stat_activity
            WHERE ${holderPid} = ANY(pg_blocking_pids(pid))
              AND query ILIKE '%ProfessionalProfile%'
              AND query ILIKE '%FOR UPDATE%'
          `;
          if (waitingSessions.length > 0) {
            lockWaitDetected = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        // Aserciones observables de serialización en el motor PostgreSQL:
        expect(lockWaitDetected).toBe(true);
        expect(waiterSettled).toBe(false);

        // Liberar la barrera para que la transacción 1 confirme y libere el lock de fila
        signalProceed();

        const waiterResult = await waiterPromise;
        expect(Array.isArray(waiterResult)).toBe(true);
        expect(waiterSettled).toBe(true);

        await holderPromise;
      } finally {
        signalProceed();
        await holderPromise.catch(() => {});
        if (waiterPromise) {
          await waiterPromise.catch(() => {});
        }
      }
    },
    SUITE_TIMEOUT_MS
  );

  it(
    "coordina la revocación y la reactivación concurrente desde SUSPENDED forzando el orden de bloqueo y demostrando que la aprobación revalida y falla por falta de especialidad",
    async () => {
      // Escenario donde la aprobación es una transición real desde el inicio:
      // 1. El perfil parte en estado SUSPENDED (la transición es SUSPENDED -> APPROVED, por lo que nunca retorna de forma idempotente).
      // 2. Posee exactamente 1 especialidad APPROVED.
      // 3. La transacción de revocación (Tx1) adquiere el row lock FOR UPDATE sobre el perfil y lo retiene en una barrera.
      // 4. La transacción de aprobación concurrente (Tx2) intenta ejecutar executeTransition(profile.id, "APPROVED")
      //    y queda físicamente bloqueada en PostgreSQL.
      // 5. Tx1 confirma la revocación de la especialidad (status: REJECTED).
      // 6. Tx2 se desbloquea en PostgreSQL, lee verificationStatus = SUSPENDED, revalida especialidades (cuenta 0)
      //    y falla explícitamente con ProfileMissingSpecialtyError.

      const { profile } = await createTestProfessional("SUSPENDED");
      const specialty = await createTestSpecialty();

      await prisma.professionalSpecialty.create({
        data: {
          professionalId: profile.id,
          specialtyId: specialty.id,
          status: "APPROVED",
        },
      });

      let signalLockAcquired: () => void = () => {};
      const lockAcquired = new Promise<void>((resolve) => {
        signalLockAcquired = resolve;
      });

      let signalProceed: () => void = () => {};
      let proceeded = false;
      const canProceed = new Promise<void>((resolve) => {
        signalProceed = () => {
          if (!proceeded) {
            proceeded = true;
            resolve();
          }
        };
      });

      let holderPid = 0;

      // Transacción 1: Revocación que adquiere el row lock sobre ProfessionalProfile bajo la misma transacción
      const revocationPromise = prisma.$transaction(async (tx) => {
        const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
        holderPid = pid;

        // 1. Actualizar especialidad a REJECTED
        await tx.professionalSpecialty.update({
          where: {
            professionalId_specialtyId: {
              professionalId: profile.id,
              specialtyId: specialty.id,
            },
          },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
          },
        });

        // 2. Adquirir row lock pesimista FOR UPDATE sobre ProfessionalProfile
        const rows = await tx.$queryRaw<Array<{ id: number; verificationStatus: string }>>`
          SELECT id, "verificationStatus"
          FROM "ProfessionalProfile"
          WHERE id = ${profile.id}
          FOR UPDATE
        `;
        expect(rows.length).toBe(1);

        // Señalizar que el row lock ya está retenido por Tx1
        signalLockAcquired();

        // Esperar en la barrera hasta que Tx2 sea detectada en espera
        await canProceed;

        return { success: true };
      });

      let approvalPromise: Promise<unknown> | null = null;

      try {
        let lockTimeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          lockTimeoutHandle = setTimeout(
            () => reject(new Error("Timeout esperando adquisición del lock de revocación")),
            5000
          );
        });

        try {
          await Promise.race([
            lockAcquired,
            timeoutPromise,
            revocationPromise.then(() => {
              throw new Error("La transacción de revocación terminó antes de señalizar lockAcquired");
            }),
          ]);
        } finally {
          clearTimeout(lockTimeoutHandle!);
        }

        // Transacción 2: Aprobación administrativa (transición real SUSPENDED -> APPROVED)
        let waiterSettled = false;
        approvalPromise = repo
          .executeTransition(profile.id, "APPROVED", specialtyChecker)
          .then((res) => {
            waiterSettled = true;
            return res;
          })
          .catch((err) => {
            waiterSettled = true;
            throw err;
          });

        // Verificar que Tx2 está bloqueada en PostgreSQL por holderPid
        let lockWaitDetected = false;
        const pollDeadline = Date.now() + 5000;
        while (Date.now() < pollDeadline) {
          const waitingSessions = await prisma.$queryRaw<Array<{ pid: number }>>`
            SELECT pid
            FROM pg_stat_activity
            WHERE ${holderPid} = ANY(pg_blocking_pids(pid))
              AND query ILIKE '%ProfessionalProfile%'
              AND query ILIKE '%FOR UPDATE%'
          `;
          if (waitingSessions.length > 0) {
            lockWaitDetected = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        // Aserciones deterministas de serialización:
        expect(lockWaitDetected).toBe(true);
        expect(waiterSettled).toBe(false);

        // Liberar la barrera para que Tx1 confirme y libere el lock de fila
        signalProceed();

        await revocationPromise;

        // Tx2 se desbloquea, lee verificationStatus = SUSPENDED, revalida especialidades (0 aprobadas)
        // y DEBE fallar explícitamente con ProfileMissingSpecialtyError
        await expect(approvalPromise).rejects.toThrow(ProfileMissingSpecialtyError);
        expect(waiterSettled).toBe(true);

        // Comprobación de estado final en base de datos real
        const finalProfile = await prisma.professionalProfile.findUnique({
          where: { id: profile.id },
          select: { verificationStatus: true },
        });
        expect(finalProfile?.verificationStatus).toBe("SUSPENDED");

        const finalSpecialty = await prisma.professionalSpecialty.findUnique({
          where: {
            professionalId_specialtyId: {
              professionalId: profile.id,
              specialtyId: specialty.id,
            },
          },
          select: { status: true },
        });
        expect(finalSpecialty?.status).toBe("REJECTED");
      } finally {
        signalProceed();
        await revocationPromise.catch(() => {});
        if (approvalPromise) {
          await approvalPromise.catch(() => {});
        }
      }
    },
    SUITE_TIMEOUT_MS
  );

  it(
    "coordina la revocación sobre un perfil APPROVED forzando el bloqueo de la aprobación competidora y demostrando que tras la suspensión la aprobación revalida y falla con ProfileMissingSpecialtyError",
    async () => {
      // 1. Perfil parte en APPROVED con exactamente 1 especialidad APPROVED
      const { profile } = await createTestProfessional("APPROVED");
      const specialty = await createTestSpecialty();

      await prisma.professionalSpecialty.create({
        data: {
          professionalId: profile.id,
          specialtyId: specialty.id,
          status: "APPROVED",
        },
      });

      let signalLockAcquired: () => void = () => {};
      const lockAcquired = new Promise<void>((resolve) => {
        signalLockAcquired = resolve;
      });

      let signalProceed: () => void = () => {};
      let proceeded = false;
      const canProceed = new Promise<void>((resolve) => {
        signalProceed = () => {
          if (!proceeded) {
            proceeded = true;
            resolve();
          }
        };
      });

      let holderPid = 0;

      // Transacción 1: Revocación que actualiza especialidad y ejecuta reconciliación atómica pasando perfil a SUSPENDED bajo lock
      const revocationPromise = prisma.$transaction(async (tx) => {
        const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
        holderPid = pid;

        await tx.professionalSpecialty.update({
          where: {
            professionalId_specialtyId: {
              professionalId: profile.id,
              specialtyId: specialty.id,
            },
          },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
          },
        });

        // Reconciliación atómica: adquiere FOR UPDATE, detecta 0 especialidades y actualiza a SUSPENDED
        const reconResult = await repo.reconcileSpecialtyRevocation(
          profile.id,
          specialtyChecker,
          tx
        );
        expect(reconResult.profileSuspended).toBe(true);

        signalLockAcquired();

        await canProceed;

        return reconResult;
      });

      let approvalPromise: Promise<unknown> | null = null;

      try {
        let lockTimeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          lockTimeoutHandle = setTimeout(
            () => reject(new Error("Timeout esperando adquisición del lock de reconciliación")),
            5000
          );
        });

        try {
          await Promise.race([
            lockAcquired,
            timeoutPromise,
            revocationPromise.then(() => {
              throw new Error("La transacción de revocación terminó antes de señalizar lockAcquired");
            }),
          ]);
        } finally {
          clearTimeout(lockTimeoutHandle!);
        }

        // Transacción 2: Intento concurrente de aprobación
        let waiterSettled = false;
        approvalPromise = repo
          .executeTransition(profile.id, "APPROVED", specialtyChecker)
          .then((res) => {
            waiterSettled = true;
            return res;
          })
          .catch((err) => {
            waiterSettled = true;
            throw err;
          });

        // Verificar que la aprobación está retenida en espera por holderPid
        let lockWaitDetected = false;
        const pollDeadline = Date.now() + 5000;
        while (Date.now() < pollDeadline) {
          const waitingSessions = await prisma.$queryRaw<Array<{ pid: number }>>`
            SELECT pid
            FROM pg_stat_activity
            WHERE ${holderPid} = ANY(pg_blocking_pids(pid))
              AND query ILIKE '%ProfessionalProfile%'
              AND query ILIKE '%FOR UPDATE%'
          `;
          if (waitingSessions.length > 0) {
            lockWaitDetected = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        expect(lockWaitDetected).toBe(true);
        expect(waiterSettled).toBe(false);

        // Liberar la barrera: Tx 1 confirma con perfil SUSPENDED
        signalProceed();

        await revocationPromise;

        // Tx 2 despierta del lock, lee verificationStatus = SUSPENDED (no es idempotente),
        // valida transición SUSPENDED -> APPROVED, cuenta 0 especialidades y DEBE fallar explícitamente con ProfileMissingSpecialtyError
        await expect(approvalPromise).rejects.toThrow(ProfileMissingSpecialtyError);
        expect(waiterSettled).toBe(true);

        const finalProfile = await prisma.professionalProfile.findUnique({
          where: { id: profile.id },
          select: { verificationStatus: true },
        });
        expect(finalProfile?.verificationStatus).toBe("SUSPENDED");
      } finally {
        signalProceed();
        await revocationPromise.catch(() => {});
        if (approvalPromise) {
          await approvalPromise.catch(() => {});
        }
      }
    },
    SUITE_TIMEOUT_MS
  );

  it(
    "la revocación de especialidades preserva estados PENDING y terminales REJECTED en base de datos real",
    async () => {
      // 1. Perfil en estado REJECTED: la revocación de especialidad NO debe moverlo a SUSPENDED
      const { profile: rejectedProfile } = await createTestProfessional("REJECTED");
      const specialty1 = await createTestSpecialty();

      await prisma.professionalSpecialty.create({
        data: {
          professionalId: rejectedProfile.id,
          specialtyId: specialty1.id,
          status: "PENDING",
        },
      });

      await ProfessionalSpecialtyService.setSpecialtyStatus(
        rejectedProfile.id,
        specialty1.id,
        "REJECTED"
      );

      const profileAfterRevocation1 = await prisma.professionalProfile.findUnique({
        where: { id: rejectedProfile.id },
        select: { verificationStatus: true },
      });
      expect(profileAfterRevocation1?.verificationStatus).toBe("REJECTED");

      // 2. Perfil en estado PENDING: la revocación de especialidad NO debe moverlo a SUSPENDED
      const { profile: pendingProfile } = await createTestProfessional("PENDING");
      const specialty2 = await createTestSpecialty();

      await prisma.professionalSpecialty.create({
        data: {
          professionalId: pendingProfile.id,
          specialtyId: specialty2.id,
          status: "PENDING",
        },
      });

      await ProfessionalSpecialtyService.setSpecialtyStatus(
        pendingProfile.id,
        specialty2.id,
        "REJECTED"
      );

      const profileAfterRevocation2 = await prisma.professionalProfile.findUnique({
        where: { id: pendingProfile.id },
        select: { verificationStatus: true },
      });
      expect(profileAfterRevocation2?.verificationStatus).toBe("PENDING");
    },
    SUITE_TIMEOUT_MS
  );
});
