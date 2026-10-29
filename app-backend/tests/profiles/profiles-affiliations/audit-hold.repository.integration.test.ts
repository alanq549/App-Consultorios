/// ARCHIVO: tests/profiles/profiles-affiliations/audit-hold.repository.integration.test.ts
/// Pruebas de integración contra PostgreSQL del adaptador de retenciones de auditoría (Audit Hold).
///
/// Propósito:
/// 1. Comprobar la persistencia del alcance (tenant / afiliación / evento).
/// 2. Comprobar que la migración aplica los `CHECK` de alcance y de emparejamiento de liberación.
/// 3. Comprobar la liberación condicional atómica y la no sobrescritura bajo concurrencia real.
/// 4. Comprobar la semántica de vigencia de `isEventOnHold` (liberado, expirado y expiración estricta).

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import prisma from "@/shared/database/prisma";
import { PrismaAffiliationAuditHoldRepository } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-audit-hold-repository";
import type { ReleaseAuditHoldOutcome } from "@/modules/profiles/affiliations/application/ports/affiliation-audit-hold-repository";

const testSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/// Ejecuta una operación del adaptador dentro de una transacción, tal como lo hace el Unit of Work.
function withRepo<T>(
  work: (repo: PrismaAffiliationAuditHoldRepository) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) =>
    work(new PrismaAffiliationAuditHoldRepository(tx)),
  );
}

describe("PrismaAffiliationAuditHoldRepository — Integration (PostgreSQL)", () => {
  let tenant: { id: number };
  let actorUser: { id: number };
  let profile1: { id: number };
  let profile2: { id: number };
  let affiliation1: { id: number };
  let affiliation2: { id: number };
  let event1: { id: number };
  let event2: { id: number };

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: {
        name: `Clinica Audit Hold ${testSuffix}`,
        slug: `clinica-audit-hold-${testSuffix}`,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    actorUser = await prisma.user.create({
      data: {
        email: `actor-audit-hold-${testSuffix}@test.invalid`,
        password: "hash",
        role: "CLIENT",
      },
      select: { id: true },
    });

    const profUser1 = await prisma.user.create({
      data: {
        email: `pro1-audit-hold-${testSuffix}@test.invalid`,
        password: "hash",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    const profUser2 = await prisma.user.create({
      data: {
        email: `pro2-audit-hold-${testSuffix}@test.invalid`,
        password: "hash",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });

    profile1 = await prisma.professionalProfile.create({
      data: { userId: profUser1.id, name: "Uno", lastName: "Hold", description: "Bio 1" },
      select: { id: true },
    });
    profile2 = await prisma.professionalProfile.create({
      data: { userId: profUser2.id, name: "Dos", lastName: "Hold", description: "Bio 2" },
      select: { id: true },
    });

    affiliation1 = await prisma.professionalTenantAffiliation.create({
      data: { professionalProfileId: profile1.id, tenantId: tenant.id, status: "ACTIVE" },
      select: { id: true },
    });
    affiliation2 = await prisma.professionalTenantAffiliation.create({
      data: { professionalProfileId: profile2.id, tenantId: tenant.id, status: "ACTIVE" },
      select: { id: true },
    });

    event1 = await prisma.professionalAffiliationAuditEvent.create({
      data: { tenantId: tenant.id, affiliationId: affiliation1.id, action: "APPLY" },
      select: { id: true },
    });
    event2 = await prisma.professionalAffiliationAuditEvent.create({
      data: { tenantId: tenant.id, affiliationId: affiliation2.id, action: "APPLY" },
      select: { id: true },
    });
  });

  beforeEach(async () => {
    // Aislamiento: cada prueba parte sin retenciones del tenant para que
    // `isEventOnHold` (que es "existe al menos un hold activo aplicable") no interfiera.
    await prisma.professionalAffiliationAuditHold.deleteMany({
      where: { tenantId: tenant.id },
    });
  });

  afterAll(async () => {
    if (tenant?.id) {
      await prisma.professionalAffiliationAuditHold.deleteMany({
        where: { tenantId: tenant.id },
      });
      await prisma.professionalAffiliationAuditEvent.deleteMany({
        where: { tenantId: tenant.id },
      });
      await prisma.professionalTenantAffiliation.deleteMany({
        where: { tenantId: tenant.id },
      });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
    if (profile1?.id) {
      await prisma.professionalProfile.delete({ where: { id: profile1.id } });
    }
    if (profile2?.id) {
      await prisma.professionalProfile.delete({ where: { id: profile2.id } });
    }
    if (actorUser?.id) {
      await prisma.user.delete({ where: { id: actorUser.id } });
    }
    await prisma.user.deleteMany({
      where: { email: { contains: `audit-hold-${testSuffix}` } },
    });
  });

  describe("create", () => {
    it("persiste una retención de alcance de evento y la recupera con sus campos", async () => {
      const expiresAt = new Date("2027-01-01T00:00:00.000Z");
      const hold = await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: event1.id,
          reason: "Litigio en curso",
          requestedByUserId: actorUser.id,
          expiresAt,
        }),
      );

      expect(hold.id).toBeGreaterThan(0);
      expect(hold.tenantId).toBe(tenant.id);
      expect(hold.affiliationId).toBe(affiliation1.id);
      expect(hold.auditEventId).toBe(event1.id);
      expect(hold.reason).toBe("Litigio en curso");
      expect(hold.requestedByUserId).toBe(actorUser.id);
      expect(hold.expiresAt).toEqual(expiresAt);
      expect(hold.releasedAt).toBeNull();
      expect(hold.releasedByUserId).toBeNull();
    });

    it("rechaza en base de datos un evento sin afiliación (CHECK de alcance)", async () => {
      let caught: unknown = null;
      try {
        await withRepo((repo) =>
          repo.create({
            tenantId: tenant.id,
            affiliationId: null,
            auditEventId: event1.id,
            reason: "Alcance inválido",
            requestedByUserId: actorUser.id,
            expiresAt: null,
          }),
        );
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(Error);
      expect(String((caught as Error).message)).toMatch(/scope_check/);
    });
  });

  describe("release", () => {
    it("libera una retención vigente en el flujo normal, con el instante asignado por la base de datos", async () => {
      const hold = await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: null,
          reason: "Retención vigente",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      // Sin fecha artificial: el adaptador no recibe el instante, lo asigna PostgreSQL.
      const result = await withRepo((repo) =>
        repo.release(tenant.id, hold.id, actorUser.id),
      );

      expect(result.outcome).toBe("RELEASED");
      if (result.outcome !== "RELEASED") throw new Error("resultado inesperado");
      expect(result.hold.releasedByUserId).toBe(actorUser.id);
      expect(result.hold.releasedAt).not.toBeNull();
      // `createdAt` y `releasedAt` provienen del mismo reloj (la base de datos).
      expect(result.hold.releasedAt!.getTime()).toBeGreaterThanOrEqual(
        result.hold.createdAt.getTime(),
      );
    });

    it("libera aunque la transacción haya comenzado antes de crear la retención (hora de sentencia)", async () => {
      const releaseResult: ReleaseAuditHoldOutcome = await prisma.$transaction(
        async (tx) => {
          // Primera sentencia de la transacción: en PostgreSQL esto fija la hora de inicio de
          // la transacción, que es justo la que devolvería `CURRENT_TIMESTAMP` más adelante.
          await tx.$queryRaw`SELECT 1`;

          // Pequeña espera para garantizar que la retención se cree con un `createdAt`
          // estrictamente posterior al inicio de la transacción.
          await new Promise((resolve) => setTimeout(resolve, 25));

          // La retención se crea DESPUÉS del inicio de la transacción, desde otra conexión
          // (transacción independiente que confirma antes de continuar).
          const hold = await prisma.professionalAffiliationAuditHold.create({
            data: {
              tenantId: tenant.id,
              affiliationId: affiliation1.id,
              auditEventId: null,
              reason: "Creada tras iniciar la transacción",
              requestedByUserId: actorUser.id,
              expiresAt: null,
            },
            select: { id: true },
          });

          // `createdAt` es posterior al inicio de la transacción. La liberación debe usar la
          // hora de la sentencia (`statement_timestamp()`), no la de inicio de la transacción
          // (`CURRENT_TIMESTAMP`), o violaría el `CHECK releasedAt >= createdAt`.
          return new PrismaAffiliationAuditHoldRepository(tx).release(
            tenant.id,
            hold.id,
            actorUser.id,
          );
        },
      );

      expect(releaseResult.outcome).toBe("RELEASED");
      if (releaseResult.outcome !== "RELEASED") throw new Error("resultado inesperado");
      expect(releaseResult.hold.releasedAt!.getTime()).toBeGreaterThanOrEqual(
        releaseResult.hold.createdAt.getTime(),
      );
    });

    it("una segunda liberación no sobrescribe la fecha ni el actor originales", async () => {
      const hold = await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: null,
          reason: "Retención a liberar dos veces",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      await withRepo((repo) => repo.release(tenant.id, hold.id, actorUser.id));

      const afterFirstRelease = await prisma.professionalAffiliationAuditHold.findUnique({
        where: { id: hold.id },
      });
      const originalReleasedAt = afterFirstRelease?.releasedAt;
      expect(originalReleasedAt).not.toBeNull();

      const secondActor = await prisma.user.create({
        data: {
          email: `second-actor-audit-hold-${testSuffix}@test.invalid`,
          password: "hash",
          role: "CLIENT",
        },
        select: { id: true },
      });

      const second = await withRepo((repo) =>
        repo.release(tenant.id, hold.id, secondActor.id),
      );

      expect(second.outcome).toBe("ALREADY_RELEASED");
      if (second.outcome !== "ALREADY_RELEASED") throw new Error("resultado inesperado");
      // La liberación original permanece intacta: ni la fecha ni el actor cambian.
      expect(second.hold.releasedAt).toEqual(originalReleasedAt);
      expect(second.hold.releasedByUserId).toBe(actorUser.id);

      const persisted = await prisma.professionalAffiliationAuditHold.findUnique({
        where: { id: hold.id },
      });
      expect(persisted?.releasedAt).toEqual(originalReleasedAt);
      expect(persisted?.releasedByUserId).toBe(actorUser.id);
    });

    it("trata como no encontrada una retención de otro tenant", async () => {
      const hold = await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: null,
          reason: "Aislada por tenant",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      const result = await withRepo((repo) =>
        repo.release(tenant.id + 999_999, hold.id, actorUser.id),
      );

      expect(result.outcome).toBe("NOT_FOUND");

      // La retención sigue vigente: el intento ajeno no la liberó.
      const persisted = await prisma.professionalAffiliationAuditHold.findUnique({
        where: { id: hold.id },
      });
      expect(persisted?.releasedAt).toBeNull();
    });

    it("serializa liberaciones concurrentes: exactamente una es efectiva y no se sobrescribe", async () => {
      const hold = await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: null,
          reason: "Concurrencia de liberación",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      const results = await Promise.all(
        [1, 2, 3, 4, 5].map(() =>
          withRepo((repo) => repo.release(tenant.id, hold.id, actorUser.id)),
        ),
      );

      const released = results.filter((r) => r.outcome === "RELEASED");
      const alreadyReleased = results.filter((r) => r.outcome === "ALREADY_RELEASED");

      // Sólo una liberación condicional puede afectar la fila vigente.
      expect(released).toHaveLength(1);
      expect(alreadyReleased).toHaveLength(4);

      const winner = released[0];
      if (winner.outcome !== "RELEASED") throw new Error("resultado inesperado");

      // La fecha persistida corresponde exactamente a la ganadora, sin sobrescritura.
      const persisted = await prisma.professionalAffiliationAuditHold.findUnique({
        where: { id: hold.id },
      });
      expect(persisted?.releasedAt).toEqual(winner.hold.releasedAt);
      expect(persisted?.releasedByUserId).toBe(actorUser.id);

      // Una liberación posterior sigue siendo no-op: el instante original es estable.
      const later = await withRepo((repo) =>
        repo.release(tenant.id, hold.id, actorUser.id),
      );
      expect(later.outcome).toBe("ALREADY_RELEASED");
      if (later.outcome !== "ALREADY_RELEASED") throw new Error("resultado inesperado");
      expect(later.hold.releasedAt).toEqual(winner.hold.releasedAt);
    });
  });

  describe("isEventOnHold", () => {
    it("un hold de tenant protege cualquier evento del tenant", async () => {
      await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: null,
          auditEventId: null,
          reason: "Retención global",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation1.id, event1.id, new Date())),
      ).resolves.toBe(true);
      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation2.id, event2.id, new Date())),
      ).resolves.toBe(true);
    });

    it("un hold de afiliación protege sólo los eventos de esa afiliación", async () => {
      await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: null,
          reason: "Retención de afiliación",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation1.id, event1.id, new Date())),
      ).resolves.toBe(true);
      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation2.id, event2.id, new Date())),
      ).resolves.toBe(false);
    });

    it("un hold de evento protege sólo ese evento", async () => {
      await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: event1.id,
          reason: "Retención de evento",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation1.id, event1.id, new Date())),
      ).resolves.toBe(true);
      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation2.id, event2.id, new Date())),
      ).resolves.toBe(false);
    });

    it("un hold liberado no bloquea la purga", async () => {
      const hold = await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: null,
          auditEventId: null,
          reason: "Retención liberada",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );
      await withRepo((repo) => repo.release(tenant.id, hold.id, actorUser.id));

      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation1.id, event1.id, new Date())),
      ).resolves.toBe(false);
    });

    it("un hold expirado no bloquea la purga y la expiración es estricta", async () => {
      const at = new Date("2026-09-01T00:00:00.000Z");

      // Expirado antes de `at`.
      await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: null,
          auditEventId: null,
          reason: "Expirado",
          requestedByUserId: actorUser.id,
          expiresAt: new Date("2026-08-31T00:00:00.000Z"),
        }),
      );
      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation1.id, event1.id, at)),
      ).resolves.toBe(false);

      // Expiración exactamente igual a `at`: ya no está vigente.
      await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: null,
          auditEventId: null,
          reason: "Expira en `at`",
          requestedByUserId: actorUser.id,
          expiresAt: at,
        }),
      );
      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation1.id, event1.id, at)),
      ).resolves.toBe(false);

      // Expiración estrictamente posterior a `at`: sigue vigente.
      await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: null,
          auditEventId: null,
          reason: "Expira después de `at`",
          requestedByUserId: actorUser.id,
          expiresAt: new Date("2026-09-01T00:00:01.000Z"),
        }),
      );
      await expect(
        withRepo((repo) => repo.isEventOnHold(tenant.id, affiliation1.id, event1.id, at)),
      ).resolves.toBe(true);
    });
  });

  describe("restricciones de la migración", () => {
    it("exige que releasedAt y releasedByUserId vayan emparejados (CHECK)", async () => {
      const hold = await withRepo((repo) =>
        repo.create({
          tenantId: tenant.id,
          affiliationId: affiliation1.id,
          auditEventId: null,
          reason: "Emparejamiento de liberación",
          requestedByUserId: actorUser.id,
          expiresAt: null,
        }),
      );

      let caught: unknown = null;
      try {
        await prisma.professionalAffiliationAuditHold.update({
          where: { id: hold.id },
          data: { releasedAt: new Date() },
        });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(Error);
      expect(String((caught as Error).message)).toMatch(/release_actor_check/);
    });
  });
});
