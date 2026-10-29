/// ARCHIVO: tests/reviews/reviews-tenancy.http.test.ts
/// Pruebas de integración HTTP del aislamiento multi-tenant de las reseñas.
///
/// Propósito: validar el contrato decidido para Reviews:
/// 1. Lectura pública del listado (header + afiliación): `GET /professional/:id` exige
///    `X-Tenant-ID` válido y una afiliación ACTIVE del profesional en ese tenant; sin selector o
///    con selector inválido → 400; tenant inexistente/inactivo o afiliación suspendida o ajena →
///    404 uniforme.
/// 2. Lecturas por propiedad: `GET /appointment/:id` y `POST /batch/by-appointments` sólo exponen
///    reseñas de citas en las que participa el usuario autenticado (cliente dueño o profesional),
///    sin exigir selector de tenant; los IDs ajenos se descartan.
/// 3. Escritura por propiedad: `POST /` sólo permite reseñar la propia cita; la cita ajena responde
///    404 uniforme sin crear la reseña.
///
/// Nota: el agregado `ratingAvg`/`ratingCount` de `ProfessionalProfile` permanece global (sin
/// `tenantId` en `Review`/`Appointment` no es derivable por tenant) y su agregación por tenant queda
/// diferida a la denormalización de la Fase 10.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import app from "@/app";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/// Encabezado de transporte del selector de tenant.
const TENANT_HEADER = "X-Tenant-ID";

const tokenService = new JwtAccessTokenService();

describe("Reseñas multi-tenant — listado público y lecturas por propiedad", () => {
  let tenantA: number;
  let tenantB: number;
  let inactiveTenant: number;
  let specialtyId: number;

  let profileA: number;
  let profileSuspended: number;
  let professionalTokenA: string;
  let professionalAUserId: number;

  let serviceA: number;

  let clientOneProfile: number;
  let clientOneToken: string;
  let clientTwoToken: string;

  let appointmentWithReview: number;
  let appointmentWithoutReview: number;
  let appointmentForCreation: number;

  // IDs creados, para la limpieza en teardown.
  const userIds: number[] = [];
  const profileIds: number[] = [];
  const affiliationIds: number[] = [];
  const serviceIds: number[] = [];
  const appointmentIds: number[] = [];

  /// Siembra un profesional con perfil y afiliación a un tenant.
  async function createProfessional(
    label: string,
    tenantId: number,
    affiliationStatus: "ACTIVE" | "SUSPENDED",
  ): Promise<{ userId: number; profileId: number }> {
    const user = await prisma.user.create({
      data: {
        email: `reviews-${label}-${suffix}@test.invalid`,
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

  /// Siembra una cita completa (servicio del profesional A) para el cliente indicado.
  async function createAppointment(
    clientProfileId: number,
    startMin: number,
  ): Promise<number> {
    const appointment = await prisma.appointment.create({
      data: {
        clientProfileId,
        professionalProfileId: profileA,
        serviceId: serviceA,
        date: new Date("2026-01-05T00:00:00.000Z"),
        startMin,
        endMin: startMin + 30,
        status: "COMPLETED",
      },
      select: { id: true },
    });
    appointmentIds.push(appointment.id);

    return appointment.id;
  }

  beforeAll(async () => {
    tenantA = (
      await prisma.tenant.create({
        data: { name: `Reseñas Tenant A ${suffix}`, slug: `resenas-a-${suffix}` },
        select: { id: true },
      })
    ).id;
    tenantB = (
      await prisma.tenant.create({
        data: { name: `Reseñas Tenant B ${suffix}`, slug: `resenas-b-${suffix}` },
        select: { id: true },
      })
    ).id;
    inactiveTenant = (
      await prisma.tenant.create({
        data: {
          name: `Reseñas Tenant inactivo ${suffix}`,
          slug: `resenas-inactivo-${suffix}`,
          status: "INACTIVE",
        },
        select: { id: true },
      })
    ).id;

    specialtyId = (
      await prisma.specialty.create({
        data: { name: `Especialidad reseñas ${suffix}` },
        select: { id: true },
      })
    ).id;

    const professionalA = await createProfessional("a", tenantA, "ACTIVE");
    profileA = professionalA.profileId;
    professionalAUserId = professionalA.userId;
    professionalTokenA = tokenService.sign({
      id: professionalA.userId,
      role: "PROFESSIONAL",
    });

    profileSuspended = (
      await createProfessional("suspendido", tenantA, "SUSPENDED")
    ).profileId;

    serviceA = (
      await prisma.service.create({
        data: {
          name: `Servicio reseñas ${suffix}`,
          description: "Servicio de prueba",
          durationMin: 30,
          price: 250,
          profileId: profileA,
          specialtyId,
        },
        select: { id: true },
      })
    ).id;
    serviceIds.push(serviceA);

    // Cliente uno: dueño de las citas reseñadas.
    const clientOne = await prisma.user.create({
      data: {
        email: `reviews-cliente-1-${suffix}@test.invalid`,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });
    userIds.push(clientOne.id);

    clientOneProfile = (
      await prisma.clientProfile.create({
        data: { userId: clientOne.id, name: "Cliente uno" },
        select: { id: true },
      })
    ).id;

    clientOneToken = tokenService.sign({ id: clientOne.id, role: "CLIENT" });

    // Cliente dos: ajeno a las citas, usado para probar el acceso cruzado.
    const clientTwo = await prisma.user.create({
      data: {
        email: `reviews-cliente-2-${suffix}@test.invalid`,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });
    userIds.push(clientTwo.id);

    await prisma.clientProfile.create({
      data: { userId: clientTwo.id, name: "Cliente dos" },
    });

    clientTwoToken = tokenService.sign({ id: clientTwo.id, role: "CLIENT" });

    appointmentWithReview = await createAppointment(clientOneProfile, 540);
    appointmentWithoutReview = await createAppointment(clientOneProfile, 600);
    // Cita dedicada a la creación exitosa, para no interferir con las pruebas negativas.
    appointmentForCreation = await createAppointment(clientOneProfile, 660);

    // Sembrado directo para no depender del envío de notificaciones en la creación.
    await prisma.review.create({
      data: {
        appointmentId: appointmentWithReview,
        rating: 5,
        comment: "Excelente atención",
      },
    });
  });

  afterAll(async () => {
    if (appointmentIds.length > 0) {
      await prisma.review.deleteMany({
        where: { appointmentId: { in: appointmentIds } },
      });
      await prisma.appointment.deleteMany({
        where: { id: { in: appointmentIds } },
      });
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

  // -------------------- Listado público por profesional --------------------

  it("expone las reseñas del profesional en el tenant donde está afiliado", async () => {
    const response = await request(app)
      .get(`/api/reviews/professional/${profileA}`)
      .set("Authorization", `Bearer ${clientOneToken}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    // Proyección pública: no se expone contacto ni identificadores internos del cliente.
    const clientProfile = response.body[0].appointment.clientProfile;
    expect(clientProfile.name).toBe("Cliente uno");
    expect(clientProfile.phone).toBeUndefined();
    expect(clientProfile.userId).toBeUndefined();
  });

  it("no expone las reseñas del profesional desde un tenant donde no está afiliado", async () => {
    const response = await request(app)
      .get(`/api/reviews/professional/${profileA}`)
      .set("Authorization", `Bearer ${clientOneToken}`)
      .set(TENANT_HEADER, String(tenantB));

    expect(response.status).toBe(404);
  });

  it("rechaza la lectura de reseñas sin selector de tenant", async () => {
    const response = await request(app)
      .get(`/api/reviews/professional/${profileA}`)
      .set("Authorization", `Bearer ${clientOneToken}`);

    expect(response.status).toBe(400);
  });

  it("rechaza un selector de tenant inválido en la lectura de reseñas", async () => {
    const response = await request(app)
      .get(`/api/reviews/professional/${profileA}`)
      .set("Authorization", `Bearer ${clientOneToken}`)
      .set(TENANT_HEADER, "0");

    expect(response.status).toBe(400);
  });

  it("responde no encontrado en la lectura de reseñas ante un tenant inactivo", async () => {
    const response = await request(app)
      .get(`/api/reviews/professional/${profileA}`)
      .set("Authorization", `Bearer ${clientOneToken}`)
      .set(TENANT_HEADER, String(inactiveTenant));

    expect(response.status).toBe(404);
  });

  it("no expone reseñas de un profesional con afiliación suspendida", async () => {
    const response = await request(app)
      .get(`/api/reviews/professional/${profileSuspended}`)
      .set("Authorization", `Bearer ${clientOneToken}`)
      .set(TENANT_HEADER, String(tenantA));

    expect(response.status).toBe(404);
  });

  // -------------------- Lectura por propiedad (cita) --------------------

  it("permite al cliente dueño leer la reseña de su cita sin selector de tenant", async () => {
    const response = await request(app)
      .get(`/api/reviews/appointment/${appointmentWithReview}`)
      .set("Authorization", `Bearer ${clientOneToken}`);

    expect(response.status).toBe(200);
    expect(response.body.appointmentId).toBe(appointmentWithReview);
  });

  it("permite al profesional de la cita leer la reseña", async () => {
    const response = await request(app)
      .get(`/api/reviews/appointment/${appointmentWithReview}`)
      .set("Authorization", `Bearer ${professionalTokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.appointmentId).toBe(appointmentWithReview);
  });

  it("no permite a otro cliente leer la reseña de una cita ajena", async () => {
    const response = await request(app)
      .get(`/api/reviews/appointment/${appointmentWithReview}`)
      .set("Authorization", `Bearer ${clientTwoToken}`);

    expect(response.status).toBe(404);
  });

  it("responde no encontrado cuando la cita propia aún no tiene reseña", async () => {
    const response = await request(app)
      .get(`/api/reviews/appointment/${appointmentWithoutReview}`)
      .set("Authorization", `Bearer ${clientOneToken}`);

    expect(response.status).toBe(404);
  });

  // -------------------- Lectura por propiedad (lote) --------------------

  it("devuelve en lote sólo las reseñas de citas propias", async () => {
    const response = await request(app)
      .post("/api/reviews/batch/by-appointments")
      .set("Authorization", `Bearer ${clientOneToken}`)
      .send({ appointmentIds: [appointmentWithReview, appointmentWithoutReview] });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].appointmentId).toBe(appointmentWithReview);
  });

  it("descarta en lote las reseñas de citas ajenas", async () => {
    const response = await request(app)
      .post("/api/reviews/batch/by-appointments")
      .set("Authorization", `Bearer ${clientTwoToken}`)
      .send({ appointmentIds: [appointmentWithReview, appointmentWithoutReview] });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  // -------------------- Escritura por propiedad --------------------

  it("no permite reseñar una cita ajena y no crea la reseña", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${clientTwoToken}`)
      .send({
        appointmentId: appointmentWithoutReview,
        rating: 1,
        comment: "No debería crearse",
      });

    expect(response.status).toBe(404);

    const created = await prisma.review.findUnique({
      where: { appointmentId: appointmentWithoutReview },
    });
    expect(created).toBeNull();
  });

  it("rechaza una segunda reseña sobre la misma cita", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${clientOneToken}`)
      .send({
        appointmentId: appointmentWithReview,
        rating: 3,
        comment: "Duplicada",
      });

    expect(response.status).toBe(409);

    const reviews = await prisma.review.count({
      where: { appointmentId: appointmentWithReview },
    });
    expect(reviews).toBe(1);
  });

  it("no permite al profesional reseñar una cita: la creación está reservada al rol CLIENT", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${professionalTokenA}`)
      .send({ appointmentId: appointmentWithoutReview, rating: 5 });

    expect(response.status).toBe(403);

    const created = await prisma.review.findUnique({
      where: { appointmentId: appointmentWithoutReview },
    });
    expect(created).toBeNull();
  });

  // -------------------- Creación exitosa --------------------

  it("crea la reseña de una cita propia, actualiza el rating y notifica al profesional", async () => {
    const ratingBefore = await prisma.professionalProfile.findUnique({
      where: { id: profileA },
      select: { ratingCount: true },
    });

    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${clientOneToken}`)
      .send({
        appointmentId: appointmentForCreation,
        rating: 4,
        comment: "Muy buena atención",
      });

    expect(response.status).toBe(201);
    expect(response.body.appointmentId).toBe(appointmentForCreation);
    expect(response.body.rating).toBe(4);

    // La reseña queda persistida pese a que la notificación se envía después del commit.
    const persisted = await prisma.review.findUnique({
      where: { appointmentId: appointmentForCreation },
    });
    expect(persisted).not.toBeNull();

    const ratingAfter = await prisma.professionalProfile.findUnique({
      where: { id: profileA },
      select: { ratingCount: true },
    });
    expect(ratingAfter?.ratingCount).toBe((ratingBefore?.ratingCount ?? 0) + 1);

    // La notificación llega al usuario del profesional, no al id de su perfil.
    const notification = await prisma.notification.findFirst({
      where: {
        userId: professionalAUserId,
        appointmentId: appointmentForCreation,
      },
    });
    expect(notification).not.toBeNull();
  });
});
