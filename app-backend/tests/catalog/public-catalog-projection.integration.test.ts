/// ARCHIVO: tests/catalog/public-catalog-projection.integration.test.ts
/// Pruebas de integración para la Misión 6 de la Fase 5 (Catalog).
/// Verifica la exposición pública segura del catálogo con aislamiento por tenant y DTOs explícitos.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/shared/database/prisma";
import { ListProfessionalPublicOffersUseCase } from "@/modules/catalog/application/use-cases/list-professional-public-offers.use-case";
import { ListProfessionalPublicSpecialtiesUseCase } from "@/modules/catalog/application/use-cases/list-professional-public-specialties.use-case";
import { ListActiveSpecialtiesUseCase } from "@/modules/catalog/application/use-cases/list-active-specialties.use-case";
import { PrismaServiceOfferRepository } from "@/modules/catalog/infrastructure/prisma/prisma-service-offer-repository";
import { PrismaProfessionalPublicSpecialtyQuery } from "@/modules/catalog/infrastructure/prisma/prisma-professional-public-specialty-query";
import { PrismaSpecialtyRepository } from "@/modules/catalog/infrastructure/prisma/prisma-specialty-repository";
import { PrismaActiveAffiliationChecker } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-active-affiliation-checker";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("Proyecciones públicas del catálogo — Misión 6 (Fase 5)", () => {
  let tenantA: number;
  let tenantB: number;
  let specialtyActive: number;
  let specialtyInactive: number;
  let professional: number;
  let affiliationA: number;
  let affiliationB: number;

  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];
  const specialtyIds: number[] = [];

  beforeAll(async () => {
    // 1. Setup Tenants
    tenantA = (await prisma.tenant.create({
      data: { name: `Tenant A ${suffix}`, slug: `tenant-a-${suffix}` },
      select: { id: true },
    })).id;
    tenantB = (await prisma.tenant.create({
      data: { name: `Tenant B ${suffix}`, slug: `tenant-b-${suffix}` },
      select: { id: true },
    })).id;

    // 2. Setup Especialidades
    specialtyActive = (await prisma.specialty.create({
      data: { name: `Especialidad Activa ${suffix}`, isActive: true },
      select: { id: true },
    })).id;
    specialtyInactive = (await prisma.specialty.create({
      data: { name: `Especialidad Inactiva ${suffix}`, isActive: false },
      select: { id: true },
    })).id;
    specialtyIds.push(specialtyActive, specialtyInactive);

    // 3. Setup Profesional
    const user = await prisma.user.create({
      data: {
        email: `public-catalog-${suffix}@test.invalid`,
        password: "password",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    userIds.push(user.id);

    const profile = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        name: "Dr. Public",
        description: "Bio pública",
      },
      select: { id: true },
    });
    profileIds.push(profile.id);
    professional = profile.id;

    // 4. Setup Afiliaciones
    affiliationA = (await prisma.professionalTenantAffiliation.create({
      data: { professionalProfileId: professional, tenantId: tenantA, status: "ACTIVE" },
      select: { id: true },
    })).id;
    affiliationB = (await prisma.professionalTenantAffiliation.create({
      data: { professionalProfileId: professional, tenantId: tenantB, status: "ACTIVE" },
      select: { id: true },
    })).id;
    affiliationIds.push(affiliationA, affiliationB);

    // 5. Setup Especialidades del Profesional
    await prisma.professionalSpecialty.create({
      data: { professionalId: professional, specialtyId: specialtyActive, status: "APPROVED" },
    });
    await prisma.professionalSpecialty.create({
      data: { professionalId: professional, specialtyId: specialtyInactive, status: "APPROVED" },
    });

    // 6. Setup Ofertas (Servicios)
    await prisma.service.create({
      data: {
        name: "Consulta A",
        description: "Servicio en A",
        durationMin: 30,
        price: 100,
        profileId: professional,
        affiliationId: affiliationA,
        specialtyId: specialtyActive,
        isActive: true,
      },
    });

    await prisma.service.create({
      data: {
        name: "Consulta B",
        description: "Servicio en B",
        durationMin: 60,
        price: 200,
        profileId: professional,
        affiliationId: affiliationB,
        specialtyId: specialtyActive,
        isActive: true,
      },
    });

    await prisma.service.create({
      data: {
        name: "Consulta Inactiva",
        description: "No debería verse",
        durationMin: 30,
        price: 50,
        profileId: professional,
        affiliationId: affiliationA,
        specialtyId: specialtyActive,
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { profileId: professional } });
    await prisma.professionalSpecialty.deleteMany({ where: { professionalId: professional } });
    await prisma.professionalTenantAffiliation.deleteMany({ where: { id: { in: affiliationIds } } });
    await prisma.professionalProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.specialty.deleteMany({ where: { id: { in: specialtyIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });

  it("ListActiveSpecialtiesUseCase: solo devuelve especialidades activas y oculta datos internos", async () => {
    const useCase = new ListActiveSpecialtiesUseCase(new PrismaSpecialtyRepository());
    const result = await useCase.execute();

    const activeSpecialty = result.find(s => s.id === specialtyActive);
    const inactiveSpecialty = result.find(s => s.id === specialtyInactive);

    expect(activeSpecialty).toBeDefined();
    expect(inactiveSpecialty).toBeUndefined();
    
    // Verificar campos del DTO público
    expect(activeSpecialty).toHaveProperty("id");
    expect(activeSpecialty).toHaveProperty("name");
    expect(activeSpecialty).toHaveProperty("description");
    expect(activeSpecialty).not.toHaveProperty("isActive");
    expect(activeSpecialty).not.toHaveProperty("createdAt");
  });

  it("ListProfessionalPublicOffersUseCase: garantiza aislamiento por tenant y formato DTO", async () => {
    const useCase = new ListProfessionalPublicOffersUseCase(
      new PrismaActiveAffiliationChecker(),
      new PrismaServiceOfferRepository()
    );

    // Consulta para Tenant A
    const resultA = await useCase.execute({ profileId: professional, tenantId: tenantA });
    expect(resultA).not.toBeNull();
    expect(resultA).toHaveLength(1);
    expect(resultA![0].name).toBe("Consulta A");
    expect(resultA![0].price).toBe("100.00"); // Verificamos formato de precio string decimal

    // Consulta para Tenant B
    const resultB = await useCase.execute({ profileId: professional, tenantId: tenantB });
    expect(resultB).not.toBeNull();
    expect(resultB).toHaveLength(1);
    expect(resultB![0].name).toBe("Consulta B");

    // Verificar que no se expongan campos internos
    expect(resultA![0]).not.toHaveProperty("isActive");
    expect(resultA![0]).not.toHaveProperty("affiliationId");
    expect(resultA![0]).not.toHaveProperty("createdAt");
  });

  it("ListProfessionalPublicSpecialtiesUseCase: filtra especialidades inactivas y garantiza aislamiento", async () => {
    const useCase = new ListProfessionalPublicSpecialtiesUseCase(
      new PrismaActiveAffiliationChecker(),
      new PrismaProfessionalPublicSpecialtyQuery()
    );

    const result = await useCase.execute({ profileId: professional, tenantId: tenantA });
    
    expect(result).not.toBeNull();
    // Debe tener solo la activa, aunque el profesional tenga ambas aprobadas
    const active = result!.find(s => s.specialtyId === specialtyActive);
    const inactive = result!.find(s => s.specialtyId === specialtyInactive);

    expect(active).toBeDefined();
    expect(active!.specialty.name).toContain("Especialidad Activa");
    expect(inactive).toBeUndefined();

    // Aislamiento: si pido un tenant donde no estoy afiliado, debe dar null
    const resultInvalid = await useCase.execute({ profileId: professional, tenantId: 999999 });
    expect(resultInvalid).toBeNull();
  });
});
