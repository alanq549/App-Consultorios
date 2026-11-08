/// ARCHIVO: tests/professionals/public-directory.http.test.ts
/// Pruebas de integración HTTP para el directorio público de profesionales multi-tenant.
///
/// Propósito: Validar de extremo a extremo (E2E / HTTP) las reglas de visibilidad y acceso público al directorio:
/// - Creación y limpieza en cascada de estructuras complejas (Users, Profiles, Affiliations, Revisions, TenantMemberships).
/// - Aislamiento multi-tenant (un tenant solo ve sus profesionales afiliados).
/// - Filtro estricto de revisiones (solo se publican versiones `APPROVED`, ignorando borradores o ediciones `PENDING_REVIEW`).
/// - Control de acceso según membresía (oculta profesionales con membresía `SUSPENDED`).
/// - Privacidad de datos (no expone campos sensibles como `email` o `phone` en el directorio público).
/// - Validación de cabeceras HTTP de selección de tenant (`X-Tenant-ID` requerida y válida).

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import app from "@/app";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";

// Sufijo único para garantizar el aislamiento de datos por cada ejecución del test runner.
const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;

const tokenService = new JwtAccessTokenService();

// Correos ficticios de prueba.
const emails = {
  visible: `directory-visible-${suffix}@test.invalid`,
  pending: `directory-pending-${suffix}@test.invalid`,
  suspended: `directory-suspended-${suffix}@test.invalid`,
  edited: `directory-edited-${suffix}@test.invalid`,
  inactiveTenant: `directory-inactive-tenant-${suffix}@test.invalid`,
  otherTenant: `directory-other-tenant-${suffix}@test.invalid`,
  suspendedAffiliation: `directory-suspended-affiliation-${suffix}@test.invalid`,
  rejectedAffiliation: `directory-rejected-affiliation-${suffix}@test.invalid`,
  withdrawnAffiliation: `directory-withdrawn-affiliation-${suffix}@test.invalid`,
  noApprovedRevision: `directory-no-approved-revision-${suffix}@test.invalid`,
  authenticated: `directory-authenticated-${suffix}@test.invalid`,
  globalPending: `directory-global-pending-${suffix}@test.invalid`,
  noSpecialty: `directory-no-specialty-${suffix}@test.invalid`,
};

let tenantA: { id: number; slug: string };
let tenantB: { id: number; slug: string };
let inactiveTenant: { id: number; slug: string };
let authenticatedToken: string;
let otherTenantProfileId: number;

// Listas para rastrear los IDs generados y realizar la limpieza en teardown (afterAll).
const userIds: number[] = [];
const profileIds: number[] = [];
const affiliationIds: number[] = [];
const revisionIds: number[] = [];

/**
 * Función auxiliar para sembrar (seed) un profesional completo con su perfil,
 * membresía de tenant, afiliación y revisiones de contenido asociadas.
 */
async function createProfessional(options: {
  email: string;
  tenantId: number;
  verificationStatus?: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  skipSpecialty?: boolean;
  membershipStatus?: "ACTIVE" | "SUSPENDED";
  affiliationStatus?:
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "WITHDRAWN";
  revisions: {
    revisionNumber: number;
    status:
    | "PENDING_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "SUPERSEDED";
    description: string;
  }[];
}) {
  // 1. Crear el usuario del profesional.
  const user = await prisma.user.create({
    data: {
      email: options.email,
      password: "test-password-hash",
      role: "PROFESSIONAL",
    },
    select: { id: true },
  });

  userIds.push(user.id);

  // 2. Crear el perfil profesional global (Fase 4 D2: APPROVED por defecto para visibilidad).
  const profile = await prisma.professionalProfile.create({
    data: {
      userId: user.id,
      name: `Profesional ${user.id}`,
      lastName: "Prueba",
      phone: "5551234567",
      description: "Descripción global que no debe publicarse",
      verificationStatus: options.verificationStatus ?? "APPROVED",
    },
    select: { id: true },
  });

  profileIds.push(profile.id);

  // Vincular especialidad aprobada requerida para el gate público (Fase 4 D2)
  if (!options.skipSpecialty) {
    const specialty = await prisma.specialty.upsert({
      where: { id: 1 },
      update: {},
      create: { name: "Medicina General", description: "General" },
    });

    await prisma.professionalSpecialty.upsert({
      where: {
        professionalId_specialtyId: {
          professionalId: profile.id,
          specialtyId: specialty.id,
        },
      },
      update: { status: "APPROVED" },
      create: {
        professionalId: profile.id,
        specialtyId: specialty.id,
        status: "APPROVED",
      },
    });
  }

  // 3. Vincular la membresía con el tenant.
  await prisma.tenantMembership.create({
    data: {
      userId: user.id,
      tenantId: options.tenantId,
      role: "MEMBER",
      status: options.membershipStatus ?? "ACTIVE",
    },
  });

  // 4. Crear la afiliación del perfil profesional con el tenant.
  const affiliation =
    await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: profile.id,
        tenantId: options.tenantId,
        status: options.affiliationStatus ?? "ACTIVE",
      },
      select: { id: true },
    });

  affiliationIds.push(affiliation.id);

  // 5. Crear el historial de revisiones enviadas.
  for (const revisionData of options.revisions) {
    const revision =
      await prisma.professionalAffiliationRevision.create({
        data: {
          affiliationId: affiliation.id,
          revisionNumber: revisionData.revisionNumber,
          status: revisionData.status,
          description: revisionData.description,
          submittedByUserId: user.id,
        },
        select: { id: true },
      });

    revisionIds.push(revision.id);
  }

  return { userId: user.id, profileId: profile.id };
}

describe("Directorio público multi-tenant", () => {
  let visibleProfileId: number;
  let pendingProfileId: number;
  let globalPendingProfileId: number;
  let noSpecialtyProfileId: number;

  /// Seeding inicial: crea los tenants y diferentes escenarios de profesionales
  /// (aprobado, pendiente de revisión, membresía suspendida y versión editada).
  beforeAll(async () => {
    // 1. Creación de Tenants principales
    tenantA = await prisma.tenant.create({
      data: {
        name: "Directory Test A",
        slug: `directory-test-a-${suffix}`,
      },
      select: { id: true, slug: true },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: "Directory Test B",
        slug: `directory-test-b-${suffix}`,
      },
      select: { id: true, slug: true },
    });

    // 2. Creación de Tenant inactivo (una sola vez)
    inactiveTenant = await prisma.tenant.create({
      data: {
        name: "Directory Inactive Tenant",
        slug: `directory-inactive-${suffix}`,
        status: "INACTIVE",
      },
      select: { id: true, slug: true },
    });

    // 3. Creación de Usuario Autenticado genérico para tests (una sola vez)
    const authenticatedUser = await prisma.user.create({
      data: {
        email: emails.authenticated,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true, role: true },
    });

    userIds.push(authenticatedUser.id);

    authenticatedToken = tokenService.sign({
      id: authenticatedUser.id,
      role: authenticatedUser.role,
    });

    // 4. Seeding de Profesionales para cada escenario

    // Profesional 1: Aprobado y totalmente visible.
    const visible = await createProfessional({
      email: emails.visible,
      tenantId: tenantA.id,
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Descripción pública aprobada",
        },
      ],
    });
    visibleProfileId = visible.profileId;

    // Profesional 2: Afiliación pendiente de revisión.
    const pending = await createProfessional({
      email: emails.pending,
      tenantId: tenantA.id,
      affiliationStatus: "PENDING_REVIEW",
      revisions: [
        {
          revisionNumber: 1,
          status: "PENDING_REVIEW",
          description: "Esta descripción no debe publicarse",
        },
      ],
    });
    pendingProfileId = pending.profileId;

    // Profesional 3: Membresía en estado SUSPENDED.
    await createProfessional({
      email: emails.suspended,
      tenantId: tenantA.id,
      membershipStatus: "SUSPENDED",
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "No publicar por membresía suspendida",
        },
      ],
    });

    // Profesional 4: Tiene versión aprobada pero con una nueva edición pendiente.
    await createProfessional({
      email: emails.edited,
      tenantId: tenantA.id,
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Última versión aprobada",
        },
        {
          revisionNumber: 2,
          status: "PENDING_REVIEW",
          description: "Edición pendiente no publicable",
        },
      ],
    });

    // Profesional 5: Pertenece exclusivamente al tenant B.
    const otherTenant = await createProfessional({
      email: emails.otherTenant,
      tenantId: tenantB.id,
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Profesional exclusivo de Tenant B",
        },
      ],
    });
    otherTenantProfileId = otherTenant.profileId;

    // Profesional 6: Afiliación suspendida.
    await createProfessional({
      email: emails.suspendedAffiliation,
      tenantId: tenantA.id,
      affiliationStatus: "SUSPENDED",
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Descripción afiliación suspendida",
        },
      ],
    });

    // Profesional 7: Afiliación rechazada.
    await createProfessional({
      email: emails.rejectedAffiliation,
      tenantId: tenantA.id,
      affiliationStatus: "REJECTED",
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Descripción afiliación rechazada",
        },
      ],
    });

    // Profesional 8: Afiliación retirada.
    await createProfessional({
      email: emails.withdrawnAffiliation,
      tenantId: tenantA.id,
      affiliationStatus: "WITHDRAWN",
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Descripción afiliación retirada",
        },
      ],
    });

    // Profesional 9: Afiliación activa pero sin revisión aprobada.
    await createProfessional({
      email: emails.noApprovedRevision,
      tenantId: tenantA.id,
      revisions: [
        {
          revisionNumber: 1,
          status: "REJECTED",
          description: "Descripción sin revisión aprobada",
        },
      ],
    });

    // Profesional 10 (Fase 4 D2): Perfil con estado de verificación global PENDING (no aprobado globalmente).
    const globalPending = await createProfessional({
      email: emails.globalPending,
      tenantId: tenantA.id,
      verificationStatus: "PENDING",
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Descripción no publicable por verificationStatus PENDING",
        },
      ],
    });
    globalPendingProfileId = globalPending.profileId;

    // Profesional 11 (Fase 4 D2): Perfil global aprobado pero sin especialidad aprobada (skipSpecialty: true).
    const noSpecialty = await createProfessional({
      email: emails.noSpecialty,
      tenantId: tenantA.id,
      verificationStatus: "APPROVED",
      skipSpecialty: true,
      revisions: [
        {
          revisionNumber: 1,
          status: "APPROVED",
          description: "Descripción no publicable por falta de especialidad aprobada",
        },
      ],
    });
    noSpecialtyProfileId = noSpecialty.profileId;
  }, 30000);

  /// Limpieza minuciosa en orden inverso estricto de dependencias FK (onDelete: Restrict)
  afterAll(async () => {
    if (revisionIds.length > 0) {
      await prisma.professionalAffiliationRevisionSocialLink.deleteMany({
        where: { revisionId: { in: revisionIds } },
      });
    }

    if (affiliationIds.length > 0) {
      await prisma.professionalAffiliationAuditEvent.deleteMany({
        where: { affiliationId: { in: affiliationIds } },
      });

      await prisma.professionalAffiliationRevision.deleteMany({
        where: { affiliationId: { in: affiliationIds } },
      });

      await prisma.professionalTenantAffiliation.deleteMany({
        where: { id: { in: affiliationIds } },
      });
    }

    if (userIds.length > 0) {
      await prisma.tenantMembership.deleteMany({
        where: { userId: { in: userIds } },
      });
    }

    if (profileIds.length > 0) {
      await prisma.professionalSpecialty.deleteMany({
        where: { professionalId: { in: profileIds } },
      });

      await prisma.professionalProfile.deleteMany({
        where: { id: { in: profileIds } },
      });
    }

    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    const tenantIdsToDelete = [tenantA?.id, tenantB?.id, inactiveTenant?.id].filter(
      (id): id is number => typeof id === "number",
    );

    if (tenantIdsToDelete.length > 0) {
      await prisma.tenant.deleteMany({
        where: { id: { in: tenantIdsToDelete } },
      });
    }
  });

  it("publica perfiles aprobados sin requerir autenticación", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(200);

    // Confirma que el perfil visible se encuentra presente en la lista pública.
    expect(
      response.body.map((profile: { id: number }) => profile.id),
    ).toContain(visibleProfileId);
  });


  it("rechaza el perfil individual si falta X-Tenant-ID", async () => {
    const response = await request(app)
      .get(`/api/professionals/${visibleProfileId}`);

    expect(response.status).toBe(400);
  });

  it("rechaza el perfil individual si X-Tenant-ID es inválido", async () => {
    const response = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", "abc");

    expect(response.status).toBe(400);
  });


  it("devuelve el mismo 404 para un perfil inexistente", async () => {
    const response = await request(app)
      .get("/api/professionals/2147483647")
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Perfil profesional no encontrado",
    });
  });

it("mantiene la misma proyección del listado con y sin autenticación", async () => {
  const anonymousResponse = await request(app)
    .get("/api/professionals/Allprofiles")
    .set("X-Tenant-ID", String(tenantA.id));

  const authenticatedResponse = await request(app)
    .get("/api/professionals/Allprofiles")
    .set("X-Tenant-ID", String(tenantA.id))
    .set("Authorization", `Bearer ${authenticatedToken}`);

  expect(anonymousResponse.status).toBe(200);
  expect(authenticatedResponse.status).toBe(200);
  expect(authenticatedResponse.body).toEqual(anonymousResponse.body);
});


  it("no muestra perfiles de otro tenant", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantB.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ id: otherTenantProfileId }),
    ]);
  });

  it("no publica afiliaciones pendientes", async () => {
    const response = await request(app)
      .get(`/api/professionals/${pendingProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Perfil profesional no encontrado",
    });
  });

  it("no publica profesionales con membresía suspendida", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantA.id));

    const descriptions = response.body.map(
      (profile: { description: string }) => profile.description,
    );

    expect(descriptions).not.toContain(
      "No publicar por membresía suspendida",
    );
  });

  it("mantiene publicada la revisión aprobada mientras existe una edición pendiente", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantA.id));

    const profile = response.body.find(
      (item: { description: string }) =>
        item.description === "Última versión aprobada" ||
        item.description === "Edición pendiente no publicable",
    );

    expect(profile).toBeDefined();
    expect(profile.description).toBe("Última versión aprobada");
  });

  it("no expone correo ni teléfono en el directorio público", async () => {
    const response = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("email");
    expect(response.body).not.toHaveProperty("phone");
    expect(response.body).not.toHaveProperty("verificationStatus");
    expect(response.body).toMatchObject({
      certificates: [],
      specialties: [],
      description: "Descripción pública aprobada",
    });
  });

  it("no expone verificationStatus en ningún resultado de Allprofiles ni de perfil individual (Fase 4 D2)", async () => {
    const listResponse = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantA.id));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBeGreaterThan(0);
    for (const item of listResponse.body) {
      expect(item).not.toHaveProperty("verificationStatus");
    }

    const detailResponse = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).not.toHaveProperty("verificationStatus");
  });

  it("rechaza la petición si falta X-Tenant-ID", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles");

    expect(response.status).toBe(400);
  });

  it("rechaza un selector de tenant inválido", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", "abc");

    expect(response.status).toBe(400);
  });

  it("devuelve 404 si el tenant no existe", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", "2147483647");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Directorio no disponible",
    });
  });

  // Contrato de tenant inactivo
  it("devuelve errores 404 uniformes según el endpoint para un tenant inactivo", async () => {
    const listResponse = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(inactiveTenant.id));

    expect(listResponse.status).toBe(404);
    expect(listResponse.body).toEqual({
      message: "Directorio no disponible",
    });

    const profileResponse = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", String(inactiveTenant.id));

    expect(profileResponse.status).toBe(404);
    expect(profileResponse.body).toEqual({
      message: "Perfil profesional no encontrado",
    });
  });

  /// Tenant inexistente en perfil individual
  it("oculta la inexistencia del tenant en la consulta de perfil individual", async () => {
    const response = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", "2147483647");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Perfil profesional no encontrado",
    });
  });

  // Perfil perteneciente únicamente a otro tenant
  it("no revela perfiles pertenecientes exclusivamente a otro tenant", async () => {
    const response = await request(app)
      .get(`/api/professionals/${otherTenantProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Perfil profesional no encontrado",
    });
  });

  // Calificaciones del listado
  it("devuelve calificaciones en cero para todos los perfiles del listado", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);

    for (const profile of response.body) {
      expect(profile.ratingAvg).toBe(0);
      expect(profile.ratingCount).toBe(0);
    }
  });

  // Calificaciones del perfil individual
  it("devuelve calificaciones en cero para el perfil individual", async () => {
    const response = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(200);
    expect(response.body.ratingAvg).toBe(0);
    expect(response.body.ratingCount).toBe(0);
  });

  // Proyección idéntica con y sin autenticación
  it("mantiene la misma proyección pública con y sin autenticación", async () => {
    const anonymousResponse = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    const authenticatedResponse = await request(app)
      .get(`/api/professionals/${visibleProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id))
      .set("Authorization", `Bearer ${authenticatedToken}`);

    expect(anonymousResponse.status).toBe(200);
    expect(authenticatedResponse.status).toBe(200);
    expect(authenticatedResponse.body).toEqual(anonymousResponse.body);
  });

  // Exclusión de estados no publicables
  it("excluye afiliaciones suspendidas, rechazadas, retiradas y sin revisión aprobada", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(200);

    const descriptions = response.body.map(
      (profile: { description: string }) => profile.description,
    );

    expect(descriptions).not.toContain("Descripción afiliación suspendida");
    expect(descriptions).not.toContain("Descripción afiliación rechazada");
    expect(descriptions).not.toContain("Descripción afiliación retirada");
    expect(descriptions).not.toContain("Descripción sin revisión aprobada");
  });

  // Exclusiones D2 (Fase 4): Estado global y especialidades
  it("excluye de Allprofiles perfiles con verificationStatus no aprobado o sin especialidad aprobada (Fase 4 D2)", async () => {
    const response = await request(app)
      .get("/api/professionals/Allprofiles")
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(200);

    const ids = response.body.map((profile: { id: number }) => profile.id);
    expect(ids).not.toContain(globalPendingProfileId);
    expect(ids).not.toContain(noSpecialtyProfileId);

    const descriptions = response.body.map(
      (profile: { description: string }) => profile.description,
    );
    expect(descriptions).not.toContain(
      "Descripción no publicable por verificationStatus PENDING"
    );
    expect(descriptions).not.toContain(
      "Descripción no publicable por falta de especialidad aprobada"
    );
  });

  it("devuelve 404 al consultar un perfil individual con verificationStatus global PENDING (Fase 4 D2)", async () => {
    const response = await request(app)
      .get(`/api/professionals/${globalPendingProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Perfil profesional no encontrado",
    });
  });

  it("devuelve 404 al consultar un perfil individual sin especialidad aprobada (Fase 4 D2)", async () => {
    const response = await request(app)
      .get(`/api/professionals/${noSpecialtyProfileId}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Perfil profesional no encontrado",
    });
  });
});