/// ARCHIVO: tests/profiles/profiles-affiliations/concurrency-and-locking.integration.test.ts
/// Pruebas de integración contra PostgreSQL para verificar el bloqueo pesimista y el control de concurrencia.
///
/// Propósito:
/// 1. Comprobar que `lockForRevisionWorkflow` ejecuta exitosamente contra PostgreSQL con identificadores entrecomillados.
/// 2. Comprobar la serialización real a nivel de base de datos bajo transacciones concurrentes.
/// 3. Validar que la aprobación de una revisión obsoleta sea prevenida cuando una nueva propuesta compite concurrentemente.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/shared/database/prisma";
import { PrismaAffiliationRepository } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-repository";
import { PrismaAffiliationUnitOfWork } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-unit-of-work";
import { PrismaActiveMembershipChecker } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-active-membership-checker";
import { PrismaProfessionalProfileOwnerChecker } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-professional-profile-owner-checker";
import { SubmitAffiliationContentUseCase } from "@/modules/profiles/affiliations/application/use-cases/submit-affiliation-content.use-case";
import { ReviewAffiliationRevisionUseCase } from "@/modules/profiles/affiliations/application/use-cases/review-affiliation-revision.use-case";
import { ObsoleteRevisionError, UnauthorizedAffiliationActionError } from "@/modules/profiles/affiliations/domain/affiliation-errors";

const testSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("Concurrency and Row-level Locking Integration (PostgreSQL)", () => {
  let tenant: { id: number; slug: string };
  let professionalUser: { id: number };
  let professionalProfile: { id: number };
  let ownerUser: { id: number };
  let affiliation: { id: number };
  let initialRevision: { id: number };

  const unitOfWork = new PrismaAffiliationUnitOfWork();
  const membershipChecker = new PrismaActiveMembershipChecker();
  const profileOwnerChecker = new PrismaProfessionalProfileOwnerChecker();

  const submitUseCase = new SubmitAffiliationContentUseCase(
    profileOwnerChecker,
    unitOfWork,
  );
  const reviewUseCase = new ReviewAffiliationRevisionUseCase(
    membershipChecker,
    unitOfWork,
  );

  beforeAll(async () => {
    // 1. Crear tenant de prueba
    tenant = await prisma.tenant.create({
      data: {
        name: `Clinica Concurrencia ${testSuffix}`,
        slug: `clinica-concurrencia-${testSuffix}`,
        status: "ACTIVE",
      },
      select: { id: true, slug: true },
    });

    // 2. Crear profesional y su perfil
    professionalUser = await prisma.user.create({
      data: {
        email: `pro-concurrency-${testSuffix}@test.invalid`,
        password: "hash",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });

    professionalProfile = await prisma.professionalProfile.create({
      data: {
        userId: professionalUser.id,
        name: "Doctor",
        lastName: "Concurrente",
        description: "Bio profesional de prueba",
      },
      select: { id: true },
    });

    // Membresía activa del profesional
    await prisma.tenantMembership.create({
      data: {
        userId: professionalUser.id,
        tenantId: tenant.id,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    // 3. Crear OWNER del tenant
    ownerUser = await prisma.user.create({
      data: {
        email: `owner-concurrency-${testSuffix}@test.invalid`,
        password: "hash",
        role: "CLIENT",
      },
      select: { id: true },
    });

    await prisma.tenantMembership.create({
      data: {
        userId: ownerUser.id,
        tenantId: tenant.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    // 4. Crear afiliación ACTIVE y primera revisión
    affiliation = await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: professionalProfile.id,
        tenantId: tenant.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    initialRevision = await prisma.professionalAffiliationRevision.create({
      data: {
        affiliationId: affiliation.id,
        revisionNumber: 1,
        status: "PENDING_REVIEW",
        description: "Descripción versión 1",
        submittedByUserId: professionalUser.id,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    // Limpieza ordenada respetando onDelete: Restrict
    if (affiliation?.id) {
      await prisma.professionalAffiliationAuditEvent.deleteMany({
        where: { affiliationId: affiliation.id },
      });
      await prisma.professionalAffiliationRevisionSocialLink.deleteMany({
        where: { revision: { affiliationId: affiliation.id } },
      });
      await prisma.professionalAffiliationRevision.deleteMany({
        where: { affiliationId: affiliation.id },
      });
      await prisma.professionalTenantAffiliation.delete({
        where: { id: affiliation.id },
      });
    }

    if (tenant?.id) {
      await prisma.tenantMembership.deleteMany({
        where: { tenantId: tenant.id },
      });
      await prisma.tenant.delete({
        where: { id: tenant.id },
      });
    }

    if (professionalProfile?.id) {
      await prisma.professionalProfile.delete({
        where: { id: professionalProfile.id },
      });
    }

    if (professionalUser?.id) {
      await prisma.user.delete({ where: { id: professionalUser.id } });
    }
    if (ownerUser?.id) {
      await prisma.user.delete({ where: { id: ownerUser.id } });
    }
  });

  it("serializa sesiones concurrentes mediante lockForRevisionWorkflow demostrando bloqueo de fila en PostgreSQL", async () => {
    // 1. Validar sintaxis y que no bloquee IDs inexistentes
    await prisma.$transaction(async (tx) => {
      const repo = new PrismaAffiliationRepository(tx);
      const notFoundLock = await repo.lockForRevisionWorkflow(
        tenant.id,
        99999999, // ID inexistente
      );
      expect(notFoundLock).toBe(false);
    });

    // 2. Demostración observable de serialización y bloqueo pesimista en PostgreSQL
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
    let waiterPromise: Promise<boolean> | null = null;

    // Transacción 1: adquiere el lock pesimista sobre la afiliación y lo retiene en la barrera
    const holderPromise = prisma.$transaction(async (tx) => {
      const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      holderPid = pid;

      const repo = new PrismaAffiliationRepository(tx);
      const locked = await repo.lockForRevisionWorkflow(tenant.id, affiliation.id);
      expect(locked).toBe(true);

      // Señalizar que el lock ya fue adquirido
      signalLockAcquired();

      // Esperar en la barrera
      await canProceed;
    });

    try {
      // Esperar a que la transacción 1 tenga el lock
      let lockTimeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        lockTimeoutHandle = setTimeout(
          () => reject(new Error("Timeout esperando adquisición del lock de afiliación")),
          5000,
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

      // Transacción 2: intenta adquirir el mismo lock sobre la misma afiliación
      let waiterSettled = false;
      waiterPromise = prisma.$transaction(async (tx) => {
        const repo = new PrismaAffiliationRepository(tx);
        return await repo.lockForRevisionWorkflow(tenant.id, affiliation.id);
      })
        .then((res) => {
          waiterSettled = true;
          return res;
        })
        .catch((err) => {
          waiterSettled = true;
          throw err;
        });

      // Sondear pg_stat_activity para verificar que la sesión 2 está bloqueada por holderPid
      let lockWaitDetected = false;
      const pollDeadline = Date.now() + 5000;
      while (Date.now() < pollDeadline) {
        const waitingSessions = await prisma.$queryRaw<Array<{ pid: number }>>`
          SELECT pid
          FROM pg_stat_activity
          WHERE ${holderPid} = ANY(pg_blocking_pids(pid))
            AND query ILIKE '%ProfessionalTenantAffiliation%'
            AND query ILIKE '%FOR UPDATE%'
        `;
        if (waitingSessions.length > 0) {
          lockWaitDetected = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      // Aserciones clave:
      // 1. PostgreSQL reporta que la segunda transacción está esperando activamente por holderPid
      expect(lockWaitDetected).toBe(true);
      // 2. La segunda transacción NO ha terminado aún
      expect(waiterSettled).toBe(false);

      // Liberar la barrera para que la transacción 1 confirme y suelte el lock
      signalProceed();

      // La transacción 2 se desbloquea en PostgreSQL, adquiere el lock y retorna true
      const waiterResult = await waiterPromise;
      expect(waiterResult).toBe(true);
      expect(waiterSettled).toBe(true);

      await holderPromise;
    } finally {
      signalProceed();
      await holderPromise.catch(() => {});
      if (waiterPromise) {
        await waiterPromise.catch(() => {});
      }
    }
  });

  it("serializa operaciones y previene que una revisión vieja sea aprobada cuando entra una nueva en carrera", async () => {
    // Escenario:
    // 1. El médico envía una nueva versión de contenido (revisión 2), lo que marca la revisión 1 como SUPERSEDED.
    // 2. Simultáneamente, el OWNER intenta aprobar la revisión 1.
    // 3. Gracias al bloqueo pesimista y la validación de obsolescencia, una de las dos se ejecuta primero.
    // Si la propuesta se ejecuta primero, el intento de aprobar la versión 1 DEBE fallar con ObsoleteRevisionError.

    // Ejecutamos la propuesta de nuevo contenido
    const submitPromise = submitUseCase.execute({
      tenantId: tenant.id,
      affiliationId: affiliation.id,
      actorUserId: professionalUser.id,
      content: {
        description: "Descripción versión 2 propuesta",
        socialLinks: [],
      },
    });

    // En paralelo, el OWNER intenta aprobar la revisión 1
    const reviewOldPromise = reviewUseCase.execute({
      tenantId: tenant.id,
      affiliationId: affiliation.id,
      revisionId: initialRevision.id,
      reviewerUserId: ownerUser.id,
      decision: "APPROVE",
    });

    const results = await Promise.allSettled([submitPromise, reviewOldPromise]);

    const submitResult = results[0];
    const reviewResult = results[1];

    // La propuesta de nuevo contenido siempre debe completarse exitosamente
    expect(submitResult.status).toBe("fulfilled");

    // Si la aprobación ocurrió antes de la nueva propuesta:
    if (reviewResult.status === "fulfilled") {
      expect(reviewResult.value.revision.status).toBe("APPROVED");
    } else {
      // Si la nueva propuesta tomó el bloqueo primero y la supersedió:
      expect(reviewResult.reason).toBeInstanceOf(ObsoleteRevisionError);
      const rev1 = await prisma.professionalAffiliationRevision.findUnique({
        where: { id: initialRevision.id },
      });
      expect(rev1?.status).toBe("SUPERSEDED");
    }

    // En cualquier orden, la última revisión en la BD debe ser la versión 2
    const latest = await prisma.professionalAffiliationRevision.findFirst({
      where: { affiliationId: affiliation.id },
      orderBy: { revisionNumber: "desc" },
    });
    expect(latest?.revisionNumber).toBe(2);
  });

  it("rechaza de forma determinista cualquier intento de aprobar una revisión que ya fue reemplazada", async () => {
    // 1. Enviamos una versión 3 que reemplaza a la versión 2
    const submitV3 = await submitUseCase.execute({
      tenantId: tenant.id,
      affiliationId: affiliation.id,
      actorUserId: professionalUser.id,
      content: {
        description: "Descripción versión 3",
        socialLinks: [],
      },
    });

    expect(submitV3.revision.revisionNumber).toBe(3);

    // 2. Un intento de aprobar la versión 1 o la versión 2 (que ya no es la más reciente)
    // debe ser rechazado inmediatamente con ObsoleteRevisionError
    await expect(
      reviewUseCase.execute({
        tenantId: tenant.id,
        affiliationId: affiliation.id,
        revisionId: initialRevision.id,
        reviewerUserId: ownerUser.id,
        decision: "APPROVE",
      }),
    ).rejects.toThrow(ObsoleteRevisionError);
  });

  it("serializa dos decisiones concurrentes sobre la misma revisión aprobando exactamente una", async () => {
    const latest = await prisma.professionalAffiliationRevision.findFirst({
      where: { affiliationId: affiliation.id },
      orderBy: { revisionNumber: "desc" },
    });

    expect(latest?.status).toBe("PENDING_REVIEW");

    // Dos peticiones de aprobación concurrentes para la misma revisión
    const approve1 = reviewUseCase.execute({
      tenantId: tenant.id,
      affiliationId: affiliation.id,
      revisionId: latest!.id,
      reviewerUserId: ownerUser.id,
      decision: "APPROVE",
    });

    const approve2 = reviewUseCase.execute({
      tenantId: tenant.id,
      affiliationId: affiliation.id,
      revisionId: latest!.id,
      reviewerUserId: ownerUser.id,
      decision: "APPROVE",
    });

    const results = await Promise.allSettled([approve1, approve2]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const rejections = results.filter((r) => r.status === "rejected");

    // Exactamente una debió triunfar
    expect(successes).toHaveLength(1);
    // Y exactamente una debió fallar por obsolescencia / concurrencia
    expect(rejections).toHaveLength(1);
    expect((rejections[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ObsoleteRevisionError,
    );
  });


  it("revocación de membresía OWNER antes de aprobar bloquea la aprobación", async () => {
    // Crear una nueva revisión pendiente
    const newRevision = await submitUseCase.execute({
      tenantId: tenant.id,
      affiliationId: affiliation.id,
      actorUserId: professionalUser.id,
      content: { description: "Nueva versión para revocación", socialLinks: [] },
    });

    // ── Barrera 1: la revocación señaliza cuando ya adquirió el lock ──
    let signalLockAcquired!: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      signalLockAcquired = resolve;
    });

    // ── Barrera 2: el test señaliza cuando la revocación puede proseguir ──
    let signalProceed!: () => void;
    let proceeded = false;
    const canProceed = new Promise<void>((resolve) => {
      signalProceed = () => {
        if (!proceeded) {
          proceeded = true;
          resolve();
        }
      };
    });

    let revocationPid = 0;
    let approvalPromise: Promise<unknown> | null = null;

    // Iniciar la transacción de revocación
    const revocationPromise = prisma.$transaction(async (tx) => {
      const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      revocationPid = pid;

      // Adquirir bloqueo pesimista sobre la fila de membresía del OWNER
      await tx.$queryRaw`SELECT "userId","tenantId","role","status" FROM "TenantMembership" WHERE "userId"=${ownerUser.id} AND "tenantId"=${tenant.id} FOR UPDATE`;

      // Señalizar que el lock ya fue adquirido
      signalLockAcquired();

      // Esperar la señal del test para proseguir
      await canProceed;

      // Marcar la membresía como SUSPENDED (valor válido del enum MembershipStatus)
      await tx.tenantMembership.update({
        where: { userId_tenantId: { userId: ownerUser.id, tenantId: tenant.id } },
        data: { status: "SUSPENDED" },
      });
    });

    try {
      // Esperar a que la revocación haya adquirido el lock compitiendo contra un timeout y el rechazo de revocationPromise
      let lockTimeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        lockTimeoutHandle = setTimeout(
          () => reject(new Error("Timeout esperando adquisición del lock por la revocación")),
          5000,
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

      // Lanzar la aprobación sin esperarla. La comprobación previa (getActiveMembership)
      // ejecuta un SELECT normal que lee ACTIVE (valor confirmado, READ COMMITTED).
      // Luego, lockActiveMembership (SELECT FOR UPDATE) quedará BLOQUEADO por la revocación.
      let approvalSettled = false;
      approvalPromise = reviewUseCase.execute({
        tenantId: tenant.id,
        affiliationId: affiliation.id,
        revisionId: newRevision.revision.id,
        reviewerUserId: ownerUser.id,
        decision: "APPROVE",
      })
        .catch((e: unknown) => e)
        .then((result) => { approvalSettled = true; return result; });

      // Esperar una señal observable en PostgreSQL de que la transacción de aprobación
      // está bloqueada específicamente por la sesión de revocación (revocationPid).
      let lockWaitDetected = false;
      const pollDeadline = Date.now() + 5000;
      while (Date.now() < pollDeadline) {
        const waitingSessions = await prisma.$queryRaw<Array<{ pid: number }>>`
          SELECT pid
          FROM pg_stat_activity
          WHERE ${revocationPid} = ANY(pg_blocking_pids(pid))
            AND query ILIKE '%TenantMembership%'
            AND query ILIKE '%FOR UPDATE%'
        `;
        if (waitingSessions.length > 0) {
          lockWaitDetected = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      // ── Aserción clave: la aprobación fue observada en PostgreSQL bloqueada por revocationPid ──
      expect(lockWaitDetected).toBe(true);
      expect(approvalSettled).toBe(false);

      // Ahora permitir que la revocación confirme (SUSPENDED) y libere el lock.
      signalProceed();

      // La aprobación se desbloquea, lockActiveMembership lee SUSPENDED → null →
      // el caso de uso lanza UnauthorizedAffiliationActionError.
      const approvalResult = await approvalPromise;
      expect(approvalResult).toBeInstanceOf(UnauthorizedAffiliationActionError);

      await revocationPromise;
    } finally {
      // Garantizar que la barrera siempre se libere y no quede la transacción colgada ante fallos
      signalProceed();
      await revocationPromise.catch(() => {});
      if (approvalPromise) {
        await approvalPromise.catch(() => {});
      }

      // Restaurar la membresía a ACTIVE para no afectar la limpieza de afterAll
      await prisma.tenantMembership.update({
        where: { userId_tenantId: { userId: ownerUser.id, tenantId: tenant.id } },
        data: { status: "ACTIVE" },
      }).catch(() => {});
    }
  });

  /// Retiene el lock pesimista de la fila de afiliación en una transacción independiente y
  /// ejecuta `operation` mientras la barrera sigue activa, comprobando en PostgreSQL que la
  /// operación queda esperando por ese lock antes de liberarlo.
  ///
  /// Sirve para detectar la regresión de que un caso de uso deje de invocar
  /// `lockForRevisionWorkflow`: si la operación no emite el `FOR UPDATE` sobre la afiliación,
  /// `pg_blocking_pids` nunca la reporta esperando y la aserción falla.
  ///
  /// @param operation - Operación de caso de uso a ejecutar bajo el lock retenido.
  /// @returns El resultado de `operation`, obtenido después de liberar la barrera.
  async function runUnderHeldAffiliationLock<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
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
    let operationSettled = false;
    let operationPromise: Promise<T> | null = null;

    // Sesión 1: adquiere el lock de la afiliación y lo retiene hasta que el test lo libere.
    const holderPromise = prisma.$transaction(async (tx) => {
      const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      holderPid = pid;

      await tx.$queryRaw`
        SELECT "id"
        FROM "ProfessionalTenantAffiliation"
        WHERE "id" = ${affiliation.id}
        AND "tenantId" = ${tenant.id}
        FOR UPDATE
      `;

      signalLockAcquired();
      await canProceed;
    });

    try {
      let lockTimeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        lockTimeoutHandle = setTimeout(
          () => reject(new Error("Timeout esperando adquisición del lock de afiliación")),
          5000,
        );
      });

      try {
        await Promise.race([
          lockAcquired,
          timeoutPromise,
          holderPromise.then(() => {
            throw new Error("La sesión que retiene el lock terminó antes de señalizar lockAcquired");
          }),
        ]);
      } finally {
        clearTimeout(lockTimeoutHandle!);
      }

      // Sesión 2: la operación bajo prueba debe quedar bloqueada por holderPid.
      operationPromise = operation()
        .then((result) => {
          operationSettled = true;
          return result;
        })
        .catch((err) => {
          operationSettled = true;
          throw err;
        });

      let lockWaitDetected = false;
      let blockedStatement: string | null = null;
      const pollDeadline = Date.now() + 5000;
      while (Date.now() < pollDeadline) {
        const blockedSessions = await prisma.$queryRaw<
          Array<{ pid: number; query: string }>
        >`
          SELECT pid, query
          FROM pg_stat_activity
          WHERE ${holderPid} = ANY(pg_blocking_pids(pid))
        `;

        if (blockedSessions.length > 0) {
          // La operación quedó esperando por el lock: se comprueba que la sentencia bloqueada
          // sea el `FOR UPDATE` que el caso de uso debe emitir sobre la fila de afiliación.
          lockWaitDetected = blockedSessions.some(
            (session) =>
              session.query.includes("FOR UPDATE") &&
              session.query.includes("ProfessionalTenantAffiliation"),
          );
          blockedStatement = blockedSessions[0].query;
          break;
        }

        // Si la operación terminó sin haber sido bloqueada, el caso de uso no está
        // adquiriendo el lock: se corta el sondeo para fallar de inmediato con diagnóstico
        // explícito en lugar de agotar el tiempo límite de la prueba.
        if (operationSettled) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      // Aserciones clave: la operación del caso de uso emitió el FOR UPDATE sobre la afiliación
      // y quedó esperando por el lock retenido por la otra sesión.
      expect(
        lockWaitDetected,
        `Sentencia observada esperando por el lock: ${blockedStatement ?? "ninguna"}`,
      ).toBe(true);
      expect(operationSettled).toBe(false);

      // Liberar la barrera: la operación se desbloquea y completa.
      signalProceed();
      const result = await operationPromise;
      expect(operationSettled).toBe(true);

      await holderPromise;
      return result;
    } finally {
      signalProceed();
      await holderPromise.catch(() => {});
      if (operationPromise) {
        await operationPromise.catch(() => {});
      }
    }
  }

  it("el envío de contenido del caso de uso espera por el lock de afiliación retenido por otra sesión", async () => {
    const previous = await prisma.professionalAffiliationRevision.findFirst({
      where: { affiliationId: affiliation.id },
      orderBy: { revisionNumber: "desc" },
    });
    expect(previous).not.toBeNull();

    const result = await runUnderHeldAffiliationLock(() =>
      submitUseCase.execute({
        tenantId: tenant.id,
        affiliationId: affiliation.id,
        actorUserId: professionalUser.id,
        content: {
          description: "Descripción propuesta bajo lock retenido",
          socialLinks: [],
        },
      }),
    );

    // La nueva versión solo pudo crearse tras liberar el lock de la afiliación.
    expect(result.revision.revisionNumber).toBe(previous!.revisionNumber + 1);
    expect(result.revision.status).toBe("PENDING_REVIEW");
  });

  it("la decisión del OWNER en el caso de uso espera por el lock de afiliación retenido por otra sesión", async () => {
    const pending = await prisma.professionalAffiliationRevision.findFirst({
      where: { affiliationId: affiliation.id, status: "PENDING_REVIEW" },
      orderBy: { revisionNumber: "desc" },
    });
    expect(pending).not.toBeNull();

    const result = await runUnderHeldAffiliationLock(() =>
      reviewUseCase.execute({
        tenantId: tenant.id,
        affiliationId: affiliation.id,
        revisionId: pending!.id,
        reviewerUserId: ownerUser.id,
        decision: "APPROVE",
      }),
    );

    expect(result.revision.status).toBe("APPROVED");
  });
});

