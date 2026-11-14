/// ARCHIVO: tests/services/catalog-tenancy.http.test.ts
/// Pruebas de integración HTTP del aislamiento multi-tenant del catálogo.
///
/// Propósito: validar que el catálogo público de un profesional (servicios y especialidades) se
/// expone únicamente en los tenants donde mantiene una afiliación ACTIVE:
/// 1. Acceso cruzado: el tenant B no obtiene el catálogo de un profesional afiliado sólo al A.
/// 2. Selector obligatorio: sin `X-Tenant-ID` válido la petición se rechaza.
/// 3. Tenant inexistente o inactivo y afiliación suspendida responden 404 uniforme, sin revelar
///    si el perfil profesional existe.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import app from "@/app";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/// Encabezado de transporte del selector de tenant.
const TENANT_HEADER = "X-Tenant-ID";

describe("Catálogo multi-tenant — servicios y especialidades del profesional", () => {
  let tenantA: number;
  let tenantB: number;
  let inactiveTenant: number;
  let specialtyId: number;
  let profileA: number;
  let profileB: number;
  let profileSuspended: number;
  let serviceAId: number;

  // IDs creados, para la limpieza en teardown.
  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];

  /// Siembra un profesional con perfil y afiliación a un tenant.
  async function createProfessional(
    label: string,
    tenantId: number,
    affiliationStatus: "ACTIVE" | "SUSPENDED",
  ): Promise<{ profileId: number; affiliationId: number }> {
    const user = await prisma.user.create({
      data: {
        email: `catalog-${label}-${suffix}@test.invalid`,
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
        status: affiliationStatus,
      },
      select: { id: true },
    });
    affiliationIds.push(affiliation.id);

    return { profileId: profile.id, affiliationId: affiliation.id };
  }

  /// Crea un servicio activo ligado a la afiliación indicada (D3).
  async function createService(
    profileId: number,
    affiliationId: number,
    name: string,
  ): Promise<number> {
    const service = await prisma.service.create({
      data: {
        name,
        description: "Servicio de prueba",
        durationMin: 30,
        price: 250,
        profileId,
        affiliationId,
        specialtyId,
      },
      select: { id: true },
    });

    return service.id;
  }

  beforeAll(async () => {
    tenantA = (
      await prisma.tenant.create({
        data: {
          name: `Catálogo Tenant A ${suffix}`,
          slug: `catalogo-a-${suffix}`,
        },
        select: { id: true },
      })
    ).id;

    tenantB = (
      await prisma.tenant.create({
        data: {
          name: `Catálogo Tenant B ${suffix}`,
          slug: `catalogo-b-${suffix}`,
        },
        select: { id: true },
      })
    ).id;

    inactiveTenant = (
      await prisma.tenant.create({
        data: {
          name: `Catálogo Tenant inactivo ${suffix}`,
          slug: `catalogo-inactivo-${suffix}`,
          status: "INACTIVE",
        },
        select: { id: true },
      })
    ).id;

    specialtyId = (
      await prisma.specialty.create({
        data: { name: `Especialidad catálogo ${suffix}` },
        select: { id: true },
      })
    ).id;

    // Profesional afiliado sólo al tenant A.
    const profA = await createProfessional("a", tenantA, "ACTIVE");
    // Profesional afiliado sólo al tenant B.
    const profB = await createProfessional("b", tenantB, "ACTIVE");
    // Profesional con afiliación suspendida en el tenant A.
    const profSuspended = await createProfessional("suspendido", tenantA, "SUSPENDED");

    profileA = profA.profileId;
    profileB = profB.profileId;
    profileSuspended = profSuspended.profileId;

    serviceAId = await createService(
      profA.profileId,
      profA.affiliationId,
      `Consulta ${suffix}`,
    );
    await createService(
      profB.profileId,
      profB.affiliationId,
      `Consulta B ${suffix}`,
    );
    await createService(
      profSuspended.profileId,
      profSuspended.affiliationId,
      `Consulta suspendida ${suffix}`,
    );

    await prisma.professionalSpecialty.create({
      data: {
        professionalId: profileA,
        specialtyId,
        status: "APPROVED",
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

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA, tenantB, inactiveTenant] } },
    });

    await prisma.specialty.deleteMany({ where: { id: specialtyId } });
  });

  it("expone los servicios del profesional en el tenant donde está afiliado", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(serviceAId);
  });

  it("no expone el catálogo del profesional en un tenant donde no está afiliado", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantB));

    expect(response.status).toBe(404);
  });

  it("no expone el catálogo de un profesional ajeno desde el tenant propio", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${profileB}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(404);
  });

  it("rechaza la consulta de catálogo sin selector de tenant", async () => {
    const response = await request(app).get(
      `/api/services/professional/${profileA}`,
    );

    expect(response.status).toBe(400);
  });

  it("rechaza un selector de tenant inválido", async () => {
    const notANumber = await request(app)
      .get(`/api/services/professional/${profileA}`)
      .set(TENANT_HEADER, "abc");

    const notPositive = await request(app)
      .get(`/api/services/professional/${profileA}`)
      .set(TENANT_HEADER, "0");

    expect(notANumber.status).toBe(400);
    expect(notPositive.status).toBe(400);
  });

  it("responde no encontrado ante un tenant inexistente", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${profileA}`)
      .set(TENANT_HEADER, "2147483647");

    expect(response.status).toBe(404);
  });

  it("responde no encontrado ante un tenant inactivo", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${profileA}`)
      .set(TENANT_HEADER, String(inactiveTenant));

    expect(response.status).toBe(404);
  });

  it("no expone el catálogo de un profesional con afiliación suspendida", async () => {
    const response = await request(app)
      .get(`/api/services/professional/${profileSuspended}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(404);
  });

  it("expone las especialidades del profesional sólo en su tenant", async () => {
    const ownTenant = await request(app)
      .get(`/api/specialties/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantA));

    const otherTenant = await request(app)
      .get(`/api/specialties/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantB));

    expect(ownTenant.status).toBe(200);
    expect(ownTenant.body).toHaveLength(1);
    expect(ownTenant.body[0].specialtyId).toBe(specialtyId);
    expect(otherTenant.status).toBe(404);
  });
});
