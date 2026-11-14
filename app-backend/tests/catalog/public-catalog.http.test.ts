/// ARCHIVO: tests/catalog/public-catalog.http.test.ts
/// Pruebas HTTP de las proyecciones públicas del catálogo (Misión 6 - Fase 5).
///
/// Propósito: validar, a nivel HTTP, que los endpoints públicos exponen DTOs explícitos y
/// seguros —sin estados administrativos ni columnas de persistencia— y que respetan el estado
/// de la oferta y de la especialidad:
/// 1. `/api/services/professional/:profileId` devuelve sólo ofertas activas de la afiliación del
///    tenant y un DTO con precio string decimal (D7).
/// 2. `/api/specialties/` (taxonomía global) devuelve sólo especialidades activas con DTO público.
/// 3. `/api/specialties/professional/:profileId` devuelve sólo elegibilidades APPROVED de
///    especialidades activas, sin exponer el `status` administrativo.
/// 4. Las rutas tenant-scoped exigen el selector `X-Tenant-ID` (400 si falta).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import app from "@/app";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/// Encabezado de transporte del selector de tenant.
const TENANT_HEADER = "X-Tenant-ID";

describe("Proyecciones públicas del catálogo — HTTP (Misión 6, Fase 5)", () => {
  let tenant: number;
  let specialtyActive: number;
  let specialtyInactive: number;
  let professional: number;
  let affiliation: number;
  let activeOfferId: number;

  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];
  const specialtyIds: number[] = [];

  beforeAll(async () => {
    tenant = (
      await prisma.tenant.create({
        data: {
          name: `Público Tenant ${suffix}`,
          slug: `publico-${suffix}`,
        },
        select: { id: true },
      })
    ).id;

    specialtyActive = (
      await prisma.specialty.create({
        data: { name: `Pública Activa ${suffix}`, isActive: true },
        select: { id: true },
      })
    ).id;
    specialtyInactive = (
      await prisma.specialty.create({
        data: { name: `Pública Inactiva ${suffix}`, isActive: false },
        select: { id: true },
      })
    ).id;
    specialtyIds.push(specialtyActive, specialtyInactive);

    const user = await prisma.user.create({
      data: {
        email: `public-catalog-http-${suffix}@test.invalid`,
        password: "test-password-hash",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    userIds.push(user.id);

    const profile = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        name: "Dr. Público",
        description: "Biografía pública",
      },
      select: { id: true },
    });
    profileIds.push(profile.id);
    professional = profile.id;

    affiliation = (
      await prisma.professionalTenantAffiliation.create({
        data: {
          professionalProfileId: professional,
          tenantId: tenant,
          status: "ACTIVE",
        },
        select: { id: true },
      })
    ).id;
    affiliationIds.push(affiliation);

    // Elegibilidad APPROVED para ambas especialidades (una activa y una inactiva).
    await prisma.professionalSpecialty.create({
      data: {
        professionalId: professional,
        specialtyId: specialtyActive,
        status: "APPROVED",
      },
    });
    await prisma.professionalSpecialty.create({
      data: {
        professionalId: professional,
        specialtyId: specialtyInactive,
        status: "APPROVED",
      },
    });

    // Oferta activa (precio no entero para verificar el formato decimal) y oferta inactiva.
    activeOfferId = (
      await prisma.service.create({
        data: {
          name: `Consulta activa ${suffix}`,
          description: "Servicio visible",
          durationMin: 30,
          price: 250.5,
          profileId: professional,
          affiliationId: affiliation,
          specialtyId: specialtyActive,
          isActive: true,
        },
        select: { id: true },
      })
    ).id;

    await prisma.service.create({
      data: {
        name: `Consulta inactiva ${suffix}`,
        description: "Servicio oculto",
        durationMin: 30,
        price: 100,
        profileId: professional,
        affiliationId: affiliation,
        specialtyId: specialtyActive,
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    if (profileIds.length > 0) {
      await prisma.service.deleteMany({
        where: { profileId: { in: profileIds } },
      });
      await prisma.professionalSpecialty.deleteMany({
        where: { professionalId: { in: profileIds } },
      });
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
    if (specialtyIds.length > 0) {
      await prisma.specialty.deleteMany({ where: { id: { in: specialtyIds } } });
    }
    await prisma.tenant.delete({ where: { id: tenant } });
  });

  it("expone sólo la oferta activa con un DTO público seguro y precio string decimal", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${professional}`)
      .set(TENANT_HEADER, String(tenant));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);

    const offer = response.body[0];
    expect(offer.id).toBe(activeOfferId);
    expect(offer.price).toBe("250.50");

    // DTO explícito: no se filtran columnas internas ni estados administrativos.
    expect(Object.keys(offer).sort()).toEqual([
      "description",
      "durationMin",
      "id",
      "name",
      "price",
      "specialty",
      "specialtyId",
    ]);
  });

  it("oculta la oferta inactiva del listado público", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${professional}`)
      .set(TENANT_HEADER, String(tenant));

    const names = response.body.map((offer: { name: string }) => offer.name);
    expect(names).not.toContain(`Consulta inactiva ${suffix}`);
    expect(names).toContain(`Consulta activa ${suffix}`);
  });

  it("la taxonomía global devuelve sólo especialidades activas con DTO público", async () => {
    const response = await request(app).get("/api/specialties");

    expect(response.status).toBe(200);

    const ids = response.body.map((s: { id: number }) => s.id);
    expect(ids).toContain(specialtyActive);
    expect(ids).not.toContain(specialtyInactive);

    // DTO explícito: sin `isActive`, `createdAt` ni `updatedAt`.
    const active = response.body.find((s: { id: number }) => s.id === specialtyActive);
    expect(Object.keys(active).sort()).toEqual(["description", "id", "name"]);
  });

  it("la proyección del profesional devuelve sólo elegibilidades APPROVED de especialidades activas", async () => {
    const response = await request(app)
      .get(`/api/specialties/professional/${professional}`)
      .set(TENANT_HEADER, String(tenant));

    expect(response.status).toBe(200);

    const ids = response.body.map((s: { specialtyId: number }) => s.specialtyId);
    expect(ids).toContain(specialtyActive);
    expect(ids).not.toContain(specialtyInactive);

    // DTO explícito: sin estado de elegibilidad interno (`status`).
    const active = response.body.find(
      (s: { specialtyId: number }) => s.specialtyId === specialtyActive,
    );
    expect(Object.keys(active).sort()).toEqual([
      "description",
      "name",
      "specialty",
      "specialtyId",
    ]);
    expect(active).not.toHaveProperty("status");
  });

  it("rechaza el listado público de ofertas sin selector de tenant", async () => {
    const response = await request(app).get(
      `/api/services/professional/${professional}`,
    );

    expect(response.status).toBe(400);
  });

  it("rechaza la proyección de especialidades del profesional sin selector de tenant", async () => {
    const response = await request(app).get(
      `/api/specialties/professional/${professional}`,
    );

    expect(response.status).toBe(400);
  });
});
