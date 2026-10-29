/// ARCHIVO: tests/profiles/profiles-affiliations/audit-purge.repository.integration.test.ts
/// Pruebas de integración contra PostgreSQL del adaptador de purga de auditoría vencida (C2).
///
/// Propósito:
/// 1. Comprobar que la purga elimina sólo eventos vencidos por retención.
/// 2. Comprobar que respeta `isEventOnHold` en sus tres alcances (tenant, afiliación, evento).
/// 3. Comprobar que un hold liberado o expirado no protege y que el hold histórico sobrevive
///    con `auditEventId` nulo (`onDelete: SetNull`).
/// 4. Comprobar el aislamiento por tenant, el lote y la idempotencia.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import prisma from "@/shared/database/prisma";
import { PrismaAffiliationAuditPurgeRepository } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-audit-purge-repository";

const testSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/// Plazo de retención usado en las pruebas (meses).
const RETENTION_MONTHS = 24;

/// Fecha claramente vencida respecto a cualquier `at` reciente.
const OLD_DATE = new Date("2020-01-01T00:00:00.000Z");

/// Fecha de corte equivalente a la usada por el caso de uso para `now`.
function cutoffFor(now: Date): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  return cutoff;
}

/// Ejecuta una operación del adaptador dentro de una transacción, como el Unit of Work.
function withPurge<T>(
  work: (repo: PrismaAffiliationAuditPurgeRepository) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) =>
    work(new PrismaAffiliationAuditPurgeRepository(tx)),
  );
}

describe("PrismaAffiliationAuditPurgeRepository — Integration (PostgreSQL)", () => {
  let tenant1: { id: number };
  let tenant2: { id: number };
  let actorUser: { id: number };
  let affiliation1: { id: number };
  let affiliation2: { id: number };
  let affiliationTenant2: { id: number };
  let profileIds: number[] = [];
  let userIds: number[] = [];

  async function createEvent(
    tenantId: number,
    affiliationId: number,
    createdAt: Date,
  ): Promise<{ id: number }> {
    return prisma.professionalAffiliationAuditEvent.create({
      data: { tenantId, affiliationId, action: "APPLY", createdAt },
      select: { id: true },
    });
  }

  async function createHold(data: {
    tenantId: number;
    affiliationId: number | null;
    auditEventId: number | null;
    expiresAt?: Date | null;
  }): Promise<{ id: number }> {
    return prisma.professionalAffiliationAuditHold.create({
      data: {
        tenantId: data.tenantId,
        affiliationId: data.affiliationId,
        auditEventId: data.auditEventId,
        reason: "Retención de prueba",
        requestedByUserId: actorUser.id,
        expiresAt: data.expiresAt ?? null,
      },
      select: { id: true },
    });
  }

  /// Libera un hold con el reloj de PostgreSQL, igual que el adaptador de producción
  /// (`statement_timestamp()`). Es imprescindible no usar `new Date()`: `createdAt` lo asigna la
  /// base (`DEFAULT CURRENT_TIMESTAMP`) y el reloj del cliente va por detrás, de modo que mezclar
  /// ambos relojes viola el `CHECK releasedAt >= createdAt`.
  async function releaseHold(holdId: number): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "ProfessionalAffiliationAuditHold"
      SET "releasedAt" = statement_timestamp(),
          "releasedByUserId" = ${actorUser.id},
          "updatedAt" = statement_timestamp()
      WHERE "id" = ${holdId}
    `;
  }

  beforeAll(async () => {
    tenant1 = await prisma.tenant.create({
      data: {
        name: `Clinica Purge 1 ${testSuffix}`,
        slug: `clinica-purge-1-${testSuffix}`,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    tenant2 = await prisma.tenant.create({
      data: {
        name: `Clinica Purge 2 ${testSuffix}`,
        slug: `clinica-purge-2-${testSuffix}`,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    actorUser = await prisma.user.create({
      data: {
        email: `actor-purge-${testSuffix}@test.invalid`,
        password: "hash",
        role: "CLIENT",
      },
      select: { id: true },
    });
    userIds.push(actorUser.id);

    const profile1 = await prisma.professionalProfile.create({
      data: {
        userId: (
          await prisma.user.create({
            data: {
              email: `pro1-purge-${testSuffix}@test.invalid`,
              password: "hash",
              role: "PROFESSIONAL",
            },
            select: { id: true },
          })
        ).id,
        name: "Uno",
        lastName: "Purge",
        description: "Bio 1",
      },
      select: { id: true, userId: true },
    });
    const profile2 = await prisma.professionalProfile.create({
      data: {
        userId: (
          await prisma.user.create({
            data: {
              email: `pro2-purge-${testSuffix}@test.invalid`,
              password: "hash",
              role: "PROFESSIONAL",
            },
            select: { id: true },
          })
        ).id,
        name: "Dos",
        lastName: "Purge",
        description: "Bio 2",
      },
      select: { id: true, userId: true },
    });
    const profile3 = await prisma.professionalProfile.create({
      data: {
        userId: (
          await prisma.user.create({
            data: {
              email: `pro3-purge-${testSuffix}@test.invalid`,
              password: "hash",
              role: "PROFESSIONAL",
            },
            select: { id: true },
          })
        ).id,
        name: "Tres",
        lastName: "Purge",
        description: "Bio 3",
      },
      select: { id: true, userId: true },
    });
    profileIds = [profile1.id, profile2.id, profile3.id];
    userIds.push(profile1.userId, profile2.userId, profile3.userId);

    affiliation1 = await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: profile1.id,
        tenantId: tenant1.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    affiliation2 = await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: profile2.id,
        tenantId: tenant1.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    affiliationTenant2 = await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: profile3.id,
        tenantId: tenant2.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });
  });

  beforeEach(async () => {
    await prisma.professionalAffiliationAuditHold.deleteMany({
      where: { tenantId: { in: [tenant1.id, tenant2.id] } },
    });
    await prisma.professionalAffiliationAuditEvent.deleteMany({
      where: { tenantId: { in: [tenant1.id, tenant2.id] } },
    });
  });

  afterAll(async () => {
    const tenantIds = [tenant1?.id, tenant2?.id].filter(
      (id): id is number => typeof id === "number",
    );
    if (tenantIds.length > 0) {
      await prisma.professionalAffiliationAuditHold.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await prisma.professionalAffiliationAuditEvent.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await prisma.professionalTenantAffiliation.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    }
    if (profileIds.length > 0) {
      await prisma.professionalProfile.deleteMany({
        where: { id: { in: profileIds } },
      });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it("purga sólo los eventos vencidos y conserva los recientes", async () => {
    const now = new Date();
    const oldEvent = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const recentEvent = await createEvent(tenant1.id, affiliation1.id, now);

    const purged = await withPurge((repo) =>
      repo.purge({
        tenantId: tenant1.id,
        createdBefore: cutoffFor(now),
        at: now,
        limit: 100,
      }),
    );

    expect(purged).toBe(1);
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: oldEvent.id },
      }),
    ).toBeNull();
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: recentEvent.id },
      }),
    ).not.toBeNull();
  });

  it("no purga un evento creado exactamente en el corte (comparación estricta)", async () => {
    const now = new Date();
    const cutoff = cutoffFor(now);
    const boundaryEvent = await createEvent(tenant1.id, affiliation1.id, cutoff);

    const purged = await withPurge((repo) =>
      repo.purge({ tenantId: tenant1.id, createdBefore: cutoff, at: now, limit: 100 }),
    );

    expect(purged).toBe(0);
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: boundaryEvent.id },
      }),
    ).not.toBeNull();
  });

  it("un hold de tenant protege toda la auditoría del tenant", async () => {
    const now = new Date();
    const eventA = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const eventB = await createEvent(tenant1.id, affiliation2.id, OLD_DATE);
    await createHold({ tenantId: tenant1.id, affiliationId: null, auditEventId: null });

    const purged = await withPurge((repo) =>
      repo.purge({ tenantId: tenant1.id, createdBefore: cutoffFor(now), at: now, limit: 100 }),
    );

    expect(purged).toBe(0);
    for (const e of [eventA, eventB]) {
      expect(
        await prisma.professionalAffiliationAuditEvent.findUnique({ where: { id: e.id } }),
      ).not.toBeNull();
    }
  });

  it("un hold de afiliación protege sólo los eventos de esa afiliación", async () => {
    const now = new Date();
    const protectedEvent = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const purgeableEvent = await createEvent(tenant1.id, affiliation2.id, OLD_DATE);
    await createHold({
      tenantId: tenant1.id,
      affiliationId: affiliation1.id,
      auditEventId: null,
    });

    const purged = await withPurge((repo) =>
      repo.purge({ tenantId: tenant1.id, createdBefore: cutoffFor(now), at: now, limit: 100 }),
    );

    expect(purged).toBe(1);
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: protectedEvent.id },
      }),
    ).not.toBeNull();
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: purgeableEvent.id },
      }),
    ).toBeNull();
  });

  it("un hold de evento protege sólo ese evento", async () => {
    const now = new Date();
    const protectedEvent = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const purgeableEvent = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    await createHold({
      tenantId: tenant1.id,
      affiliationId: affiliation1.id,
      auditEventId: protectedEvent.id,
    });

    const purged = await withPurge((repo) =>
      repo.purge({ tenantId: tenant1.id, createdBefore: cutoffFor(now), at: now, limit: 100 }),
    );

    expect(purged).toBe(1);
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: protectedEvent.id },
      }),
    ).not.toBeNull();
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: purgeableEvent.id },
      }),
    ).toBeNull();
  });

  it("un hold liberado o expirado no protege la purga", async () => {
    const now = new Date();
    const releasedEvent = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const expiredEvent = await createEvent(tenant1.id, affiliation2.id, OLD_DATE);

    const releasedHold = await createHold({
      tenantId: tenant1.id,
      affiliationId: null,
      auditEventId: null,
    });
    await releaseHold(releasedHold.id);

    await createHold({
      tenantId: tenant1.id,
      affiliationId: null,
      auditEventId: null,
      expiresAt: new Date("2020-12-31T00:00:00.000Z"),
    });

    const purged = await withPurge((repo) =>
      repo.purge({ tenantId: tenant1.id, createdBefore: cutoffFor(now), at: now, limit: 100 }),
    );

    expect(purged).toBe(2);
    for (const e of [releasedEvent, expiredEvent]) {
      expect(
        await prisma.professionalAffiliationAuditEvent.findUnique({ where: { id: e.id } }),
      ).toBeNull();
    }
  });

  it("al purgar un evento retenido por un hold liberado, el hold sobrevive con auditEventId nulo", async () => {
    const now = new Date();
    const event = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const hold = await createHold({
      tenantId: tenant1.id,
      affiliationId: affiliation1.id,
      auditEventId: event.id,
    });
    await releaseHold(hold.id);

    const purged = await withPurge((repo) =>
      repo.purge({ tenantId: tenant1.id, createdBefore: cutoffFor(now), at: now, limit: 100 }),
    );

    expect(purged).toBe(1);
    const survivor = await prisma.professionalAffiliationAuditHold.findUnique({
      where: { id: hold.id },
    });
    // El hold histórico se conserva; PostgreSQL anula la referencia al evento eliminado.
    expect(survivor).not.toBeNull();
    expect(survivor?.auditEventId).toBeNull();
    expect(survivor?.tenantId).toBe(tenant1.id);
  });

  it("no purga auditoría de otro tenant", async () => {
    const now = new Date();
    const ownEvent = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const otherEvent = await createEvent(tenant2.id, affiliationTenant2.id, OLD_DATE);

    const purged = await withPurge((repo) =>
      repo.purge({ tenantId: tenant1.id, createdBefore: cutoffFor(now), at: now, limit: 100 }),
    );

    expect(purged).toBe(1);
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: ownEvent.id },
      }),
    ).toBeNull();
    expect(
      await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: otherEvent.id },
      }),
    ).not.toBeNull();
  });

  it("respeta el límite del lote y drena el remanente en ejecuciones sucesivas", async () => {
    const now = new Date();
    await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    await createEvent(tenant1.id, affiliation1.id, OLD_DATE);

    const input = {
      tenantId: tenant1.id,
      createdBefore: cutoffFor(now),
      at: now,
      limit: 2,
    };

    const count = await withPurge((repo) => repo.countPurgeable(input));
    const firstRun = await withPurge((repo) => repo.purge(input));
    const secondRun = await withPurge((repo) => repo.purge(input));
    const afterDrain = await withPurge((repo) => repo.purge(input));

    expect(count).toBe(3);
    expect(firstRun).toBe(2);
    expect(secondRun).toBe(1);
    // Idempotente: ya no queda nada elegible.
    expect(afterDrain).toBe(0);
  });

  it("countPurgeable coincide con lo que la purga elimina", async () => {
    const now = new Date();
    const eventA = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    const eventB = await createEvent(tenant1.id, affiliation2.id, OLD_DATE);
    const heldEvent = await createEvent(tenant1.id, affiliation1.id, OLD_DATE);
    await createHold({
      tenantId: tenant1.id,
      affiliationId: affiliation1.id,
      auditEventId: heldEvent.id,
    });

    const input = {
      tenantId: tenant1.id,
      createdBefore: cutoffFor(now),
      at: now,
      limit: 100,
    };

    const count = await withPurge((repo) => repo.countPurgeable(input));
    const purged = await withPurge((repo) => repo.purge(input));

    expect(count).toBe(2);
    expect(purged).toBe(count);
    for (const e of [eventA, eventB, heldEvent]) {
      const found = await prisma.professionalAffiliationAuditEvent.findUnique({
        where: { id: e.id },
      });
      // Sólo el evento retenido sobrevive.
      expect(found !== null).toBe(e === heldEvent);
    }
  });
});
