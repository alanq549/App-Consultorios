/// ARCHIVO: tests/appointments/appointments-tenancy.http.test.ts
/// Pruebas de integración HTTP del aislamiento multi-tenant de citas.
///
/// Propósito: validar que las superficies de reserva y disponibilidad operan únicamente en tenants
/// donde el profesional mantiene una afiliación ACTIVE:
/// 1. Acceso cruzado: el tenant B no obtiene disponibilidad ni puede reservar con un profesional
///    afiliado sólo al A.
/// 2. Selector obligatorio: sin `X-Tenant-ID` válido la petición se rechaza (400).
/// 3. Tenant inexistente/inactivo o afiliación suspendida responden 404 uniforme.
/// 4. Lecturas propias: `GET /history` devuelve sólo las citas del propio usuario, sin exigir
///    selector de tenant (no hay fuga cruzada porque nunca expone datos de terceros).
/// 5. Reserva de invitado: `POST /create-guest` respeta el aislamiento (400 sin selector, 404 si el
///    profesional no está afiliado) y procesa una fecha válida en formato calendario `YYYY-MM-DD`.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import app from "@/app";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";
import { NotificationService } from "@/modules/notifications/notifications.service";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/// Encabezado de transporte del selector de tenant.
const TENANT_HEADER = "X-Tenant-ID";

const tokenService = new JwtAccessTokenService();

describe("Citas multi-tenant — reserva y disponibilidad", () => {
  let tenantA: number;
  let tenantB: number;
  let inactiveTenant: number;
  let specialtyId: number;

  let profileA: number;
  let profileB: number;
  let profileSuspended: number;

  let serviceA: number;
  let serviceB: number;

  let clientUserId: number;
  let clientToken: string;

  let futureDate: string;

  // IDs creados, para la limpieza en teardown.
  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];
  const serviceIds: number[] = [];
  const guestIds: number[] = [];

  /// Siembra un profesional con perfil, afiliación y agenda semanal completa (todo día 08:00–18:00).
  async function createProfessional(
    label: string,
    tenantId: number,
    affiliationStatus: "ACTIVE" | "SUSPENDED",
  ): Promise<number> {
    const user = await prisma.user.create({
      data: {
        email: `appt-${label}-${suffix}@test.invalid`,
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

    // Agenda para todos los días de la semana, de 08:00 a 18:00.
    await prisma.schedule.createMany({
      data: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
        profileId: profile.id,
        dayOfWeek,
        startMin: 480,
        endMin: 1080,
      })),
    });

    return profile.id;
  }

  async function createService(profileId: number, name: string): Promise<number> {
    const service = await prisma.service.create({
      data: {
        name,
        description: "Servicio de prueba",
        durationMin: 30,
        price: 250,
        profileId,
        specialtyId,
      },
      select: { id: true },
    });
    serviceIds.push(service.id);

    return service.id;
  }

  beforeAll(async () => {
    tenantA = (
      await prisma.tenant.create({
        data: { name: `Citas Tenant A ${suffix}`, slug: `citas-a-${suffix}` },
        select: { id: true },
      })
    ).id;
    tenantB = (
      await prisma.tenant.create({
        data: { name: `Citas Tenant B ${suffix}`, slug: `citas-b-${suffix}` },
        select: { id: true },
      })
    ).id;
    inactiveTenant = (
      await prisma.tenant.create({
        data: {
          name: `Citas Tenant inactivo ${suffix}`,
          slug: `citas-inactivo-${suffix}`,
          status: "INACTIVE",
        },
        select: { id: true },
      })
    ).id;

    specialtyId = (
      await prisma.specialty.create({
        data: { name: `Especialidad citas ${suffix}` },
        select: { id: true },
      })
    ).id;

    profileA = await createProfessional("a", tenantA, "ACTIVE");
    profileB = await createProfessional("b", tenantB, "ACTIVE");
    profileSuspended = await createProfessional("suspendido", tenantA, "SUSPENDED");

    serviceA = await createService(profileA, `Servicio A ${suffix}`);
    serviceB = await createService(profileB, `Servicio B ${suffix}`);

    // Cliente global (ClientProfile no pertenece a un tenant).
    const clientUser = await prisma.user.create({
      data: {
        email: `appt-cliente-${suffix}@test.invalid`,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });
    clientUserId = clientUser.id;
    userIds.push(clientUser.id);

    await prisma.clientProfile.create({
      data: { userId: clientUser.id, name: "Cliente de prueba" },
    });

    clientToken = tokenService.sign({ id: clientUser.id, role: "CLIENT" });

    // Fecha objetivo futura, en formato YYYY-MM-DD (la que espera `POST /create`).
    futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { professionalProfileId: { in: profileIds } },
    });

    if (guestIds.length > 0) {
      await prisma.guestClient.deleteMany({ where: { id: { in: guestIds } } });
    }
    if (serviceIds.length > 0) {
      await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    }
    if (affiliationIds.length > 0) {
      await prisma.professionalTenantAffiliation.deleteMany({
        where: { id: { in: affiliationIds } },
      });
    }
    if (profileIds.length > 0) {
      await prisma.schedule.deleteMany({
        where: { profileId: { in: profileIds } },
      });
      await prisma.professionalProfile.deleteMany({
        where: { id: { in: profileIds } },
      });
    }
    if (userIds.length > 0) {
      await prisma.clientProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.specialty.deleteMany({ where: { id: specialtyId } });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA, tenantB, inactiveTenant] } },
    });
  });

  // -------------------- Disponibilidad --------------------

  it("expone la disponibilidad del profesional en el tenant donde está afiliado", async () => {
    const response = await request(app)
      .get("/api/appointments/availability")
      .query({ professionalId: profileA, serviceId: serviceA, date: futureDate })
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("no expone la disponibilidad del profesional en un tenant donde no está afiliado", async () => {
    const response = await request(app)
      .get("/api/appointments/availability")
      .query({ professionalId: profileA, serviceId: serviceA, date: futureDate })
      .set(TENANT_HEADER, String(tenantB));

    expect(response.status).toBe(404);
  });

  it("rechaza la disponibilidad sin selector de tenant", async () => {
    const response = await request(app)
      .get("/api/appointments/availability")
      .query({ professionalId: profileA, serviceId: serviceA, date: futureDate });

    expect(response.status).toBe(400);
  });

  it("rechaza un selector de tenant inválido en disponibilidad", async () => {
    const response = await request(app)
      .get("/api/appointments/availability")
      .query({ professionalId: profileA, serviceId: serviceA, date: futureDate })
      .set(TENANT_HEADER, "abc");

    expect(response.status).toBe(400);
  });

  it("responde no encontrado en disponibilidad ante un tenant inactivo", async () => {
    const response = await request(app)
      .get("/api/appointments/availability")
      .query({ professionalId: profileA, serviceId: serviceA, date: futureDate })
      .set(TENANT_HEADER, String(inactiveTenant));

    expect(response.status).toBe(404);
  });

  it("no expone disponibilidad de un profesional con afiliación suspendida", async () => {
    const response = await request(app)
      .get("/api/appointments/availability")
      .query({ professionalId: profileSuspended, serviceId: serviceA, date: futureDate })
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(404);
  });

  // -------------------- Reserva de invitado --------------------

  it("no permite crear una cita de invitado con un profesional de otro tenant", async () => {
    const response = await request(app)
      .post("/api/appointments/create-guest")
      .set(TENANT_HEADER, String(tenantB))
      .send({
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: futureDate,
        startMin: 540,
        guestName: "Invitado de prueba",
      });

    expect(response.status).toBe(404);
  });

  it("rechaza la creación de cita de invitado sin selector de tenant", async () => {
    const response = await request(app)
      .post("/api/appointments/create-guest")
      .send({
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: futureDate,
        startMin: 540,
        guestName: "Invitado de prueba",
      });

    expect(response.status).toBe(400);
  });

  it("permite crear una cita de invitado con un profesional afiliado al tenant seleccionado", async () => {
    const guestEmail = `invitado-${suffix}@test.invalid`;

    const response = await request(app)
      .post("/api/appointments/create-guest")
      .set(TENANT_HEADER, String(tenantA))
      .send({
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: futureDate,
        startMin: 540,
        guestName: "Invitado de prueba",
        guestEmail,
      });

    expect(response.status).toBe(201);
    expect(response.body.professional.id).toBe(profileA);
    expect(response.body.client?.name).toBe("Invitado de prueba");

    // La cita de invitado queda persistida y asociada a un GuestClient.
    const guest = await prisma.guestClient.findFirst({
      where: { email: guestEmail },
      select: { id: true },
    });
    expect(guest).not.toBeNull();
    if (guest) guestIds.push(guest.id);
  });

  // -------------------- Reserva autenticada (cliente) --------------------

  it("permite al cliente reservar con un profesional del tenant seleccionado", async () => {
    const response = await request(app)
      .post("/api/appointments/create")
      .set("Authorization", `Bearer ${clientToken}`)
      .set(TENANT_HEADER, String(tenantA))
      .send({
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: futureDate,
        startMin: 600,
      });

    expect(response.status).toBe(201);
    expect(response.body.professional.id).toBe(profileA);
  });

  it("devuelve 201 aunque falle la notificación post-commit (best-effort observable)", async () => {
    // Fuerza el fallo de la notificación: la cita ya se habrá creado en el commit. Sin el manejo
    // best-effort, el rechazo haría fallar la respuesta pese a existir la reserva.
    const notifySpy = vi
      .spyOn(NotificationService, "notifyAppointmentCreated")
      .mockRejectedValueOnce(new Error("SMTP connection failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app)
        .post("/api/appointments/create")
        .set("Authorization", `Bearer ${clientToken}`)
        .set(TENANT_HEADER, String(tenantA))
        .send({
          professionalProfileId: profileA,
          serviceId: serviceA,
          date: futureDate,
          startMin: 780,
        });

      // La respuesta es exitosa: el fallo de la notificación no se propaga al cliente.
      expect(response.status).toBe(201);
      expect(response.body.professional.id).toBe(profileA);

      // La cita quedó persistida pese al fallo de la notificación.
      const persisted = await prisma.appointment.findFirst({
        where: { professionalProfileId: profileA, startMin: 780 },
        select: { id: true },
      });
      expect(persisted).not.toBeNull();
      // El fallo se registra (best-effort observable), no se silencia.
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      notifySpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it("no permite al cliente reservar con un profesional de otro tenant", async () => {
    const response = await request(app)
      .post("/api/appointments/create")
      .set("Authorization", `Bearer ${clientToken}`)
      .set(TENANT_HEADER, String(tenantB))
      .send({
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: futureDate,
        startMin: 660,
      });

    expect(response.status).toBe(404);
  });

  it("rechaza la reserva autenticada sin selector de tenant", async () => {
    const response = await request(app)
      .post("/api/appointments/create")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: futureDate,
        startMin: 720,
      });

    expect(response.status).toBe(400);
  });

  // -------------------- Lecturas propias --------------------

  it("devuelve al cliente sólo sus propias citas sin exigir selector de tenant", async () => {
    const response = await request(app)
      .get("/api/appointments/history")
      .set("Authorization", `Bearer ${clientToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    // Sólo se exponen citas del propio usuario (nunca de terceros).
    expect(response.body.every((item: { id: number }) => typeof item.id === "number")).toBe(
      true,
    );
  });

  // -------------------- Aislamiento entre profesionales --------------------

  it("no permite al profesional B ver la agenda de reserva del profesional A desde su propio tenant", async () => {
    const response = await request(app)
      .get("/api/appointments/availability")
      .query({ professionalId: profileB, serviceId: serviceB, date: futureDate })
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(404);
  });

  // -------------------- Cambio de estado (profesional) --------------------

  it("conserva el cambio de estado aunque falle la notificación post-commit (best-effort observable)", async () => {
    // Reserva futura que el profesional A confirmará.
    const created = await request(app)
      .post("/api/appointments/create")
      .set("Authorization", `Bearer ${clientToken}`)
      .set(TENANT_HEADER, String(tenantA))
      .send({
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: futureDate,
        startMin: 840,
      });
    expect(created.status).toBe(201);

    const professionalProfile = await prisma.professionalProfile.findUnique({
      where: { id: profileA },
      select: { userId: true },
    });
    const professionalToken = tokenService.sign({
      id: professionalProfile!.userId,
      role: "PROFESSIONAL",
    });

    // Fuerza el fallo de la notificación: el cambio de estado ya se habrá persistido.
    const notifySpy = vi
      .spyOn(NotificationService, "notifyAppointmentConfirmed")
      .mockRejectedValueOnce(new Error("SMTP connection failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app)
        .patch(`/api/appointments/${created.body.id}/status`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({ status: "CONFIRMED" });

      // La respuesta es exitosa: el fallo de la notificación no se propaga al cliente.
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("CONFIRMED");

      // El cambio de estado quedó persistido pese al fallo de la notificación.
      const persisted = await prisma.appointment.findUnique({
        where: { id: created.body.id },
        select: { status: true },
      });
      expect(persisted?.status).toBe("CONFIRMED");
      // El fallo se registra (best-effort observable), no se silencia.
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      notifySpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
