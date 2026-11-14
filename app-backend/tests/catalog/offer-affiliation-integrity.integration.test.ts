/// ARCHIVO: tests/catalog/offer-affiliation-integrity.integration.test.ts
/// Pruebas de integración contra PostgreSQL del nuevo modelo de oferta por afiliación (D3, D8).
///
/// Verifican, contra el motor real:
///   1. Unicidad por afiliación: el mismo nombre de oferta convive en dos afiliaciones distintas
///      con términos comerciales independientes (aceptación de Misión 3).
///   2. Integridad referencial: la base rechaza una oferta ligada a una afiliación inexistente.
///   3. Garantía profesional↔afiliación: la base (FK compuesta) rechaza una oferta cuya afiliación
///      pertenece a otro profesional, sin escribir nada.
///   4. Sin asignación por defecto: el backfill rechaza una afiliación de otro profesional.
///   5. Clasificación real del inventario: unívoco, ambiguo, huérfano y ya mapeado según D8.
///   6. Apply idempotente y repetible del mapping aprobado.
///   7. Alcance por afiliación: las ofertas no cruzan entre afiliaciones/tenants.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/shared/database/prisma";
import {
  applyOfferAffiliationMappingEntries,
  buildOfferAffiliationInventory,
} from "@/modules/catalog/infrastructure/legacy/offer-affiliation-backfill";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Espera el error de Prisma de una promesa y devuelve su código (`P2002`, `P2003`, ...). */
async function capturePrismaErrorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

describe("Oferta por afiliación — integridad y backfill (PostgreSQL)", () => {
  let tenantA: number;
  let tenantB: number;
  let tenantSuspended: number;
  let specialtyId: number;

  // Profesional con dos afiliaciones ACTIVAS (tenant A y B) → casos AMBIGUOUS.
  let professionalMulti: number;
  let affiliationMultiA: number;
  let affiliationMultiB: number;

  // Profesional con una única afiliación ACTIVA → caso UNIQUE.
  let professionalSingle: number;
  let affiliationSingle: number;

  // Profesional cuya única afiliación está SUSPENDED → caso ORPHAN.
  let professionalOrphan: number;
  let affiliationOrphan: number;

  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];

  async function createProfessional(label: string): Promise<number> {
    const user = await prisma.user.create({
      data: {
        email: `offer-affiliation-${label}-${suffix}@test.invalid`,
        password: "test-password-hash",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    userIds.push(user.id);

    const profile = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        name: `Profesional ${label}`,
        description: "Biografía de prueba para oferta por afiliación",
      },
      select: { id: true },
    });
    profileIds.push(profile.id);

    return profile.id;
  }

  async function createAffiliation(
    professionalProfileId: number,
    tenantId: number,
    status: "ACTIVE" | "SUSPENDED"
  ): Promise<number> {
    const affiliation = await prisma.professionalTenantAffiliation.create({
      data: { professionalProfileId, tenantId, status },
      select: { id: true },
    });
    affiliationIds.push(affiliation.id);
    return affiliation.id;
  }

  /** Crea una oferta legacy (sin afiliación) para ejercitar el backfill. */
  async function createLegacyOffer(profileId: number, name: string): Promise<number> {
    const offer = await prisma.service.create({
      data: {
        name,
        description: "Oferta legacy pendiente de mapping",
        durationMin: 30,
        price: 200,
        profileId,
        specialtyId,
      },
      select: { id: true },
    });
    return offer.id;
  }

  beforeAll(async () => {
    tenantA = (
      await prisma.tenant.create({
        data: { name: `Oferta Tenant A ${suffix}`, slug: `oferta-a-${suffix}` },
        select: { id: true },
      })
    ).id;

    tenantB = (
      await prisma.tenant.create({
        data: { name: `Oferta Tenant B ${suffix}`, slug: `oferta-b-${suffix}` },
        select: { id: true },
      })
    ).id;

    tenantSuspended = (
      await prisma.tenant.create({
        data: { name: `Oferta Tenant suspendido ${suffix}`, slug: `oferta-s-${suffix}` },
        select: { id: true },
      })
    ).id;

    specialtyId = (
      await prisma.specialty.create({
        data: { name: `Especialidad oferta ${suffix}` },
        select: { id: true },
      })
    ).id;

    professionalMulti = await createProfessional("multi");
    affiliationMultiA = await createAffiliation(professionalMulti, tenantA, "ACTIVE");
    affiliationMultiB = await createAffiliation(professionalMulti, tenantB, "ACTIVE");

    professionalSingle = await createProfessional("single");
    affiliationSingle = await createAffiliation(professionalSingle, tenantA, "ACTIVE");

    professionalOrphan = await createProfessional("orphan");
    affiliationOrphan = await createAffiliation(professionalOrphan, tenantSuspended, "SUSPENDED");
  });

  afterAll(async () => {
    if (profileIds.length > 0) {
      await prisma.service
        .deleteMany({ where: { profileId: { in: profileIds } } })
        .catch(() => {});
      await prisma.professionalSpecialty
        .deleteMany({ where: { professionalId: { in: profileIds } } })
        .catch(() => {});
    }
    if (affiliationIds.length > 0) {
      await prisma.professionalTenantAffiliation
        .deleteMany({ where: { id: { in: affiliationIds } } })
        .catch(() => {});
    }
    if (profileIds.length > 0) {
      await prisma.professionalProfile
        .deleteMany({ where: { id: { in: profileIds } } })
        .catch(() => {});
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }
    await prisma.tenant
      .deleteMany({ where: { id: { in: [tenantA, tenantB, tenantSuspended] } } })
      .catch(() => {});
    await prisma.specialty.deleteMany({ where: { id: specialtyId } }).catch(() => {});
  });

  it("permite el mismo nombre de oferta en dos afiliaciones con términos independientes", async () => {
    const sharedName = `Consulta compartida ${suffix}`;

    const offerInA = await prisma.service.create({
      data: {
        name: sharedName,
        description: "Consulta en el consultorio A",
        durationMin: 30,
        price: 150,
        profileId: professionalMulti,
        affiliationId: affiliationMultiA,
        specialtyId,
      },
    });

    const offerInB = await prisma.service.create({
      data: {
        name: sharedName,
        description: "Consulta en el consultorio B",
        durationMin: 60,
        price: 380.5,
        profileId: professionalMulti,
        affiliationId: affiliationMultiB,
        specialtyId,
      },
    });

    expect(offerInA.id).not.toBe(offerInB.id);
    expect(offerInA.affiliationId).toBe(affiliationMultiA);
    expect(offerInB.affiliationId).toBe(affiliationMultiB);
    expect(Number(offerInA.price)).toBe(150);
    expect(Number(offerInB.price)).toBe(380.5);
    expect(offerInA.durationMin).toBe(30);
    expect(offerInB.durationMin).toBe(60);
  });

  it("impide duplicar el nombre dentro de la misma afiliación (unicidad por afiliación)", async () => {
    const duplicatedName = `Consulta única ${suffix}`;

    await prisma.service.create({
      data: {
        name: duplicatedName,
        description: "Primera oferta con este nombre",
        durationMin: 30,
        price: 100,
        profileId: professionalSingle,
        affiliationId: affiliationSingle,
        specialtyId,
      },
    });

    const code = await capturePrismaErrorCode(
      prisma.service.create({
        data: {
          name: duplicatedName,
          description: "Segunda oferta con el mismo nombre en la misma afiliación",
          durationMin: 45,
          price: 120,
          profileId: professionalSingle,
          affiliationId: affiliationSingle,
          specialtyId,
        },
      })
    );

    expect(code).toBe("P2002");
  });

  it("impide que una oferta referencie una afiliación inexistente (integridad referencial)", async () => {
    const code = await capturePrismaErrorCode(
      prisma.service.create({
        data: {
          name: `Consulta huérfana ${suffix}`,
          description: "Oferta ligada a una afiliación inexistente",
          durationMin: 30,
          price: 100,
          profileId: professionalSingle,
          affiliationId: 2147483647,
          specialtyId,
        },
      })
    );

    expect(code).toBe("P2003");
  });

  it("impide vincular una oferta a la afiliación de otro profesional (garantía D3 en la base)", async () => {
    const name = `Consulta cruzada ${suffix}`;

    // `affiliationMultiA` pertenece a `professionalMulti`, pero la oferta se crea para
    // `professionalSingle`: la FK compuesta debe rechazarlo aunque ambas referencias existan.
    const code = await capturePrismaErrorCode(
      prisma.service.create({
        data: {
          name,
          description: "Oferta que intenta usar la afiliación de otro profesional",
          durationMin: 30,
          price: 100,
          profileId: professionalSingle,
          affiliationId: affiliationMultiA,
          specialtyId,
        },
      })
    );

    expect(code).toBe("P2003");

    const stored = await prisma.service.findFirst({ where: { name }, select: { id: true } });
    expect(stored).toBeNull();
  });

  it("clasifica el inventario real en unívoco, ambiguo, huérfano y ya mapeado", async () => {
    const legacyMulti = await createLegacyOffer(professionalMulti, `Legacy multi ${suffix}`);
    const legacySingle = await createLegacyOffer(professionalSingle, `Legacy single ${suffix}`);
    const legacyOrphan = await createLegacyOffer(professionalOrphan, `Legacy orphan ${suffix}`);

    const alreadyMapped = await prisma.service.create({
      data: {
        name: `Ya mapeada ${suffix}`,
        description: "Oferta ya vinculada a su propia afiliación",
        durationMin: 30,
        price: 200,
        profileId: professionalSingle,
        affiliationId: affiliationSingle,
        specialtyId,
      },
      select: { id: true },
    });

    const report = await buildOfferAffiliationInventory();
    const byServiceId = new Map(report.decisions.map((decision) => [decision.serviceId, decision]));

    const decisionMulti = byServiceId.get(legacyMulti);
    expect(decisionMulti?.kind).toBe("AMBIGUOUS");
    expect(decisionMulti?.candidateAffiliationIds).toEqual(
      [affiliationMultiA, affiliationMultiB].sort((left, right) => left - right)
    );

    const decisionSingle = byServiceId.get(legacySingle);
    expect(decisionSingle?.kind).toBe("UNIQUE");
    expect(decisionSingle?.proposedAffiliationId).toBe(affiliationSingle);

    const decisionOrphan = byServiceId.get(legacyOrphan);
    expect(decisionOrphan?.kind).toBe("ORPHAN");
    expect(decisionOrphan?.proposedAffiliationId).toBeNull();

    const decisionMapped = byServiceId.get(alreadyMapped.id);
    expect(decisionMapped?.kind).toBe("ALREADY_MAPPED");
    expect(decisionMapped?.proposedAffiliationId).toBe(affiliationSingle);
  });

  it("rechaza asignar una afiliación de otro profesional sin escribir nada", async () => {
    const legacy = await createLegacyOffer(professionalSingle, `Legacy ajeno ${suffix}`);

    const result = await applyOfferAffiliationMappingEntries([
      { serviceId: legacy, affiliationId: affiliationMultiA },
    ]);

    expect(result.applied).toBe(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toMatch(/otro profesional/);

    const stored = await prisma.service.findUnique({
      where: { id: legacy },
      select: { affiliationId: true },
    });
    expect(stored?.affiliationId).toBeNull();
  });

  it("aplica el mapping aprobado de forma idempotente y repetible", async () => {
    const legacy = await createLegacyOffer(professionalSingle, `Legacy aplicable ${suffix}`);

    const firstRun = await applyOfferAffiliationMappingEntries([
      { serviceId: legacy, affiliationId: affiliationSingle },
    ]);
    expect(firstRun.applied).toBe(1);
    expect(firstRun.skipped).toBe(0);
    expect(firstRun.rejected).toHaveLength(0);

    // Reejecutar el mismo mapping no sobrescribe ni vuelve a contar como aplicado.
    const secondRun = await applyOfferAffiliationMappingEntries([
      { serviceId: legacy, affiliationId: affiliationSingle },
    ]);
    expect(secondRun.applied).toBe(0);
    expect(secondRun.skipped).toBe(1);

    const stored = await prisma.service.findUnique({
      where: { id: legacy },
      select: { affiliationId: true },
    });
    expect(stored?.affiliationId).toBe(affiliationSingle);
  });

  it("no permite que una oferta aparezca bajo la afiliación de otro tenant", async () => {
    const offerInB = await prisma.service.findFirst({
      where: { profileId: professionalMulti, affiliationId: affiliationMultiB },
      select: { id: true },
    });
    expect(offerInB).not.toBeNull();

    const crossedLookup = await prisma.service.findFirst({
      where: { id: offerInB!.id, affiliationId: affiliationMultiA },
      select: { id: true },
    });

    expect(crossedLookup).toBeNull();
  });
});
