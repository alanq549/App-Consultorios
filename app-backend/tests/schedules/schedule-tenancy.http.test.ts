/// ARCHIVO: tests/schedules/schedule-tenancy.http.test.ts
/// Pruebas de integración HTTP del aislamiento multi-tenant de la agenda (Scheduling).
///
/// Propósito: validar que la agenda pública de un profesional se expone únicamente en los tenants
/// donde mantiene una afiliación ACTIVE:
/// 1. Acceso cruzado: el tenant B no obtiene la agenda de un profesional afiliado sólo al A.
/// 2. Selector obligatorio: sin `X-Tenant-ID` válido la petición se rechaza.
/// 3. Tenant inexistente o inactivo y afiliación suspendida responden 404 uniforme, sin revelar
///    si el perfil profesional existe.
/// 4. Escritura propia: el profesional gestiona su agenda autenticado por su propio perfil y la
///    operación no asigna un tenant por defecto.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import app from "@/app";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/// Encabezado de transporte del selector de tenant.
const TENANT_HEADER = "X-Tenant-ID";

const tokenService = new JwtAccessTokenService();

describe("Agenda multi-tenant — bloques horarios del profesional", () => {
  let tenantA: number;
  let tenantB: number;
  let inactiveTenant: number;
  let profileA: number;
  let profileB: number;
  let profileSuspended: number;
  let scheduleAId: number;
  let professionalAToken: string;

  // IDs creados, para la limpieza en teardown.
  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];

  /// Siembra un profesional con perfil y afiliación a un tenant.
  async function createProfessional(
    label: string,
    tenantId: number,
    affiliationStatus: "ACTIVE" | "SUSPENDED",
  ): Promise<{ userId: number; profileId: number }> {
    const user = await prisma.user.create({
      data: {
        email: `schedule-${label}-${suffix}@test.invalid`,
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

    return { userId: user.id, profileId: profile.id };
  }

  /// Crea un bloque horario activo propiedad del perfil indicado.
  async function createSchedule(
    profileId: number,
    dayOfWeek: number,
    startMin: number,
    endMin: number,
  ): Promise<number> {
    const schedule = await prisma.schedule.create({
      data: { profileId, dayOfWeek, startMin, endMin },
      select: { id: true },
    });

    return schedule.id;
  }

  beforeAll(async () => {
    tenantA = (
      await prisma.tenant.create({
        data: {
          name: `Agenda Tenant A ${suffix}`,
          slug: `agenda-a-${suffix}`,
        },
        select: { id: true },
      })
    ).id;

    tenantB = (
      await prisma.tenant.create({
        data: {
          name: `Agenda Tenant B ${suffix}`,
          slug: `agenda-b-${suffix}`,
        },
        select: { id: true },
      })
    ).id;

    inactiveTenant = (
      await prisma.tenant.create({
        data: {
          name: `Agenda Tenant inactivo ${suffix}`,
          slug: `agenda-inactivo-${suffix}`,
          status: "INACTIVE",
        },
        select: { id: true },
      })
    ).id;

    // Profesional afiliado sólo al tenant A.
    const professionalA = await createProfessional("a", tenantA, "ACTIVE");
    profileA = professionalA.profileId;

    professionalAToken = tokenService.sign({
      id: professionalA.userId,
      role: "PROFESSIONAL",
    });

    // Profesional afiliado sólo al tenant B.
    profileB = (await createProfessional("b", tenantB, "ACTIVE")).profileId;
    // Profesional con afiliación suspendida en el tenant A.
    profileSuspended = (
      await createProfessional("suspendido", tenantA, "SUSPENDED")
    ).profileId;

    scheduleAId = await createSchedule(profileA, 1, 540, 720);
    await createSchedule(profileB, 2, 540, 720);
    await createSchedule(profileSuspended, 3, 540, 720);
  });

  afterAll(async () => {
    if (profileIds.length > 0) {
      await prisma.schedule.deleteMany({
        where: { profileId: { in: profileIds } },
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
  });

  it("expone la agenda del profesional en el tenant donde está afiliado", async () => {
    const response = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(scheduleAId);
  });

  it("no expone la agenda del profesional en un tenant donde no está afiliado", async () => {
    const response = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantB));

    expect(response.status).toBe(404);
  });

  it("no expone la agenda de un profesional ajeno desde el tenant propio", async () => {
    const response = await request(app)
      .get(`/api/schedules/professional/${profileB}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(404);
  });

  it("rechaza la consulta de agenda sin selector de tenant", async () => {
    const response = await request(app).get(
      `/api/schedules/professional/${profileA}`,
    );

    expect(response.status).toBe(400);
  });

  it("rechaza un selector de tenant inválido", async () => {
    const notANumber = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, "abc");

    const notPositive = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, "0");

    expect(notANumber.status).toBe(400);
    expect(notPositive.status).toBe(400);
  });

  it("responde no encontrado ante un tenant inexistente", async () => {
    const response = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, "2147483647");

    expect(response.status).toBe(404);
  });

  it("responde no encontrado ante un tenant inactivo", async () => {
    const response = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, String(inactiveTenant));

    expect(response.status).toBe(404);
  });

  it("no expone la agenda de un profesional con afiliación suspendida", async () => {
    const response = await request(app)
      .get(`/api/schedules/professional/${profileSuspended}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(404);
  });

  it("permite al profesional crear su propio bloque sin selector de tenant y sin asignar tenant por defecto", async () => {
    const created = await request(app)
      .post("/api/schedules")
      .set("Authorization", `Bearer ${professionalAToken}`)
      .send({ dayOfWeek: 4, startMin: 600, endMin: 660 });

    expect(created.status).toBe(201);
    expect(created.body.profileId).toBe(profileA);

    // El bloque creado es visible en el tenant donde el profesional está afiliado.
    const visible = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(visible.status).toBe(200);
    const days = visible.body.map((item: { dayOfWeek: number }) => item.dayOfWeek);
    expect(days).toContain(4);

    // Y no es visible desde un tenant donde no está afiliado.
    const hidden = await request(app)
      .get(`/api/schedules/professional/${profileA}`)
      .set(TENANT_HEADER, String(tenantB));

    expect(hidden.status).toBe(404);
  });
});
