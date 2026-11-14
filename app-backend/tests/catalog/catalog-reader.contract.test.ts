/// ARCHIVO: tests/catalog/catalog-reader.contract.test.ts
/// Pruebas de contrato e integración del adaptador `PrismaCatalogReader` (Misión 5).
///
/// Propósito: verificar que el contrato reservable que consume Appointments resuelve la oferta de
/// forma tenant-aware y devuelve `null` de manera uniforme cuando el servicio no es reservable:
/// 1. Oferta correcta → proyección `BookableService` con precio exacto de dos decimales y moneda MXN.
/// 2. Acceso cruzado: oferta de otra afiliación/tenant → `null`.
/// 3. Oferta inactiva → `null`.
/// 4. Especialidad desactivada (D6) → `null`.
/// 5. Fila legacy sin afiliación (D8, pendiente de backfill) → `null`.
/// 6. Oferta de otro profesional → `null`.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/shared/database/prisma";
import { PrismaCatalogReader } from "@/modules/catalog/infrastructure/prisma/prisma-catalog-reader";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("CatalogReader — lectura reservable tenant-aware", () => {
  const reader = new PrismaCatalogReader();

  let tenantA: number;
  let tenantB: number;
  let specialtyActive: number;
  let specialtyInactive: number;

  let profileA: number;
  let profileB: number;

  let affiliationA: number;
  let affiliationB: number;

  let serviceA: number;
  let serviceInactive: number;
  let serviceInactiveSpecialty: number;
  let serviceLegacy: number;
  let serviceOtherProfessional: number;

  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];
  const serviceIds: number[] = [];

  /// Siembra un profesional con perfil y una afiliación ACTIVE al tenant indicado.
  async function createProfessional(
    label: string,
    tenantId: number,
  ): Promise<{ profileId: number; affiliationId: number }> {
    const user = await prisma.user.create({
      data: {
        email: `reader-${label}-${suffix}@test.invalid`,
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
        description: "Biografía de prueba",
      },
      select: { id: true },
    });
    profileIds.push(profile.id);

    const affiliation = await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: profile.id,
        tenantId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    affiliationIds.push(affiliation.id);

    return { profileId: profile.id, affiliationId: affiliation.id };
  }

  async function createService(data: {
    name: string;
    profileId: number;
    affiliationId?: number;
    specialtyId: number;
    price?: number;
    isActive?: boolean;
    durationMin?: number;
  }): Promise<number> {
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: "Servicio de prueba",
        durationMin: data.durationMin ?? 30,
        price: data.price ?? 250,
        profileId: data.profileId,
        affiliationId: data.affiliationId,
        specialtyId: data.specialtyId,
        isActive: data.isActive ?? true,
      },
      select: { id: true },
    });
    serviceIds.push(service.id);
    return service.id;
  }

  beforeAll(async () => {
    tenantA = (
      await prisma.tenant.create({
        data: { name: `Reader A ${suffix}`, slug: `reader-a-${suffix}` },
        select: { id: true },
      })
    ).id;
    tenantB = (
      await prisma.tenant.create({
        data: { name: `Reader B ${suffix}`, slug: `reader-b-${suffix}` },
        select: { id: true },
      })
    ).id;

    specialtyActive = (
      await prisma.specialty.create({
        data: { name: `Especialidad activa ${suffix}` },
        select: { id: true },
      })
    ).id;
    specialtyInactive = (
      await prisma.specialty.create({
        data: { name: `Especialidad inactiva ${suffix}`, isActive: false },
        select: { id: true },
      })
    ).id;

    const professionalA = await createProfessional("a", tenantA);
    const professionalB = await createProfessional("b", tenantB);
    profileA = professionalA.profileId;
    profileB = professionalB.profileId;
    affiliationA = professionalA.affiliationId;
    affiliationB = professionalB.affiliationId;

    serviceA = await createService({
      name: `Servicio A ${suffix}`,
      profileId: profileA,
      affiliationId: affiliationA,
      specialtyId: specialtyActive,
      price: 250.5,
      durationMin: 45,
    });
    serviceInactive = await createService({
      name: `Servicio inactivo ${suffix}`,
      profileId: profileA,
      affiliationId: affiliationA,
      specialtyId: specialtyActive,
      isActive: false,
    });
    serviceInactiveSpecialty = await createService({
      name: `Servicio especialidad inactiva ${suffix}`,
      profileId: profileA,
      affiliationId: affiliationA,
      specialtyId: specialtyInactive,
    });
    // Fila legacy (D8): sin afiliación, pendiente de backfill → no reservable.
    serviceLegacy = await createService({
      name: `Servicio legacy ${suffix}`,
      profileId: profileA,
      specialtyId: specialtyActive,
    });
    serviceOtherProfessional = await createService({
      name: `Servicio B ${suffix}`,
      profileId: profileB,
      affiliationId: affiliationB,
      specialtyId: specialtyActive,
    });
  });

  afterAll(async () => {
    if (serviceIds.length > 0) {
      await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    }
    if (affiliationIds.length > 0) {
      await prisma.professionalTenantAffiliation.deleteMany({
        where: { id: { in: affiliationIds } },
      });
    }
    if (profileIds.length > 0) {
      await prisma.professionalProfile.deleteMany({
        where: { id: { in: profileIds } },
      });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.specialty.deleteMany({
      where: { id: { in: [specialtyActive, specialtyInactive] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA, tenantB] } },
    });
  });

  it("devuelve la proyección reservable con precio exacto de dos decimales y moneda MXN", async () => {
    const result = await reader.getBookableService(serviceA, profileA, tenantA);

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: serviceA,
      professionalProfileId: profileA,
      affiliationId: affiliationA,
      name: `Servicio A ${suffix}`,
      durationMin: 45,
      currency: "MXN",
      specialtyId: specialtyActive,
    });
    // D7: string decimal exacto, nunca `number` de punto flotante.
    expect(result!.price).toBe("250.50");
  });

  it("devuelve null cuando el tenant no corresponde a la afiliación de la oferta", async () => {
    const result = await reader.getBookableService(serviceA, profileA, tenantB);
    expect(result).toBeNull();
  });

  it("devuelve null cuando la oferta está inactiva", async () => {
    const result = await reader.getBookableService(
      serviceInactive,
      profileA,
      tenantA,
    );
    expect(result).toBeNull();
  });

  it("devuelve null cuando la especialidad de la oferta está desactivada (D6)", async () => {
    const result = await reader.getBookableService(
      serviceInactiveSpecialty,
      profileA,
      tenantA,
    );
    expect(result).toBeNull();
  });

  it("devuelve null para una oferta legacy sin afiliación (D8)", async () => {
    const result = await reader.getBookableService(
      serviceLegacy,
      profileA,
      tenantA,
    );
    expect(result).toBeNull();
  });

  it("devuelve null cuando la oferta pertenece a otro profesional", async () => {
    const result = await reader.getBookableService(
      serviceOtherProfessional,
      profileA,
      tenantB,
    );
    expect(result).toBeNull();
  });
});
