/// ARCHIVO: tests/profiles/profiles-affiliations/affiliations.http.test.ts
/// Pruebas de integración HTTP de extremo a extremo para las operaciones del Slice B de Afiliaciones.

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";
import app from "@/app";

const tokenService = new JwtAccessTokenService();

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let activeTenant: { id: number; name: string; slug: string };
let inactiveTenant: { id: number; name: string; slug: string };
let otherTenant: { id: number; name: string; slug: string };

let professionalUser: { id: number; email: string };
let professionalProfile: { id: number };
let professionalToken: string;

let ownerUser: { id: number; email: string };
let ownerToken: string;

let memberUser: { id: number; email: string };
let memberToken: string;

let otherOwnerUser: { id: number; email: string };
let otherOwnerToken: string;

describe("HTTP Endpoints - Profiles Tenancy Slice B (Affiliations)", () => {
  beforeAll(async () => {
    // 1. Tenants
    activeTenant = await prisma.tenant.create({
      data: {
        name: `Active Clinic ${suffix}`,
        slug: `active-clinic-${suffix}`,
        status: "ACTIVE",
      },
      select: { id: true, name: true, slug: true },
    });

    inactiveTenant = await prisma.tenant.create({
      data: {
        name: `Inactive Clinic ${suffix}`,
        slug: `inactive-clinic-${suffix}`,
        status: "INACTIVE",
      },
      select: { id: true, name: true, slug: true },
    });

    otherTenant = await prisma.tenant.create({
      data: {
        name: `Other Clinic ${suffix}`,
        slug: `other-clinic-${suffix}`,
        status: "ACTIVE",
      },
      select: { id: true, name: true, slug: true },
    });

    // 2. Users
    professionalUser = await prisma.user.create({
      data: {
        email: `doctor-${suffix}@test.invalid`,
        password: "hashed-password",
        role: "PROFESSIONAL",
      },
      select: { id: true, email: true },
    });

    professionalProfile = await prisma.professionalProfile.create({
      data: {
        userId: professionalUser.id,
        name: "Dr. Gregory House",
        lastName: "House",
        phone: "12345678",
        description: "Médico especialista en diagnóstico",
        verificationStatus: "APPROVED",
      },
      select: { id: true },
    });

    ownerUser = await prisma.user.create({
      data: {
        email: `owner-${suffix}@test.invalid`,
        password: "hashed-password",
        role: "PROFESSIONAL",
      },
      select: { id: true, email: true },
    });

    memberUser = await prisma.user.create({
      data: {
        email: `member-${suffix}@test.invalid`,
        password: "hashed-password",
        role: "PROFESSIONAL",
      },
      select: { id: true, email: true },
    });

    otherOwnerUser = await prisma.user.create({
      data: {
        email: `other-owner-${suffix}@test.invalid`,
        password: "hashed-password",
        role: "PROFESSIONAL",
      },
      select: { id: true, email: true },
    });

    // 3. Memberships
    await prisma.tenantMembership.createMany({
      data: [
        {
          userId: ownerUser.id,
          tenantId: activeTenant.id,
          role: "OWNER",
          status: "ACTIVE",
        },
        {
          userId: memberUser.id,
          tenantId: activeTenant.id,
          role: "MEMBER",
          status: "ACTIVE",
        },
        {
          userId: otherOwnerUser.id,
          tenantId: otherTenant.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      ],
    });

    // 4. Tokens
    professionalToken = tokenService.sign({
      id: professionalUser.id,
      role: "PROFESSIONAL",
    });

    ownerToken = tokenService.sign({
      id: ownerUser.id,
      role: "PROFESSIONAL",
    });

    memberToken = tokenService.sign({
      id: memberUser.id,
      role: "PROFESSIONAL",
    });

    otherOwnerToken = tokenService.sign({
      id: otherOwnerUser.id,
      role: "PROFESSIONAL",
    });
  });

  afterAll(async () => {
    // Limpieza de datos en cascada manual
    await prisma.professionalAffiliationAuditEvent.deleteMany({
      where: {
        tenantId: {
          in: [activeTenant.id, inactiveTenant.id, otherTenant.id],
        },
      },
    });

    await prisma.professionalAffiliationRevisionSocialLink.deleteMany({
      where: {
        revision: {
          affiliation: {
            tenantId: {
              in: [activeTenant.id, inactiveTenant.id, otherTenant.id],
            },
          },
        },
      },
    });

    await prisma.professionalAffiliationRevision.deleteMany({
      where: {
        affiliation: {
          tenantId: {
            in: [activeTenant.id, inactiveTenant.id, otherTenant.id],
          },
        },
      },
    });

    await prisma.professionalTenantAffiliation.deleteMany({
      where: {
        tenantId: {
          in: [activeTenant.id, inactiveTenant.id, otherTenant.id],
        },
      },
    });

    await prisma.tenantMembership.deleteMany({
      where: {
        tenantId: {
          in: [activeTenant.id, inactiveTenant.id, otherTenant.id],
        },
      },
    });

    if (professionalProfile?.id) {
      await prisma.professionalProfile.deleteMany({
        where: { id: professionalProfile.id },
      });
    }

    const userIds = [
      professionalUser?.id,
      ownerUser?.id,
      memberUser?.id,
      otherOwnerUser?.id,
    ].filter((id): id is number => typeof id === "number");

    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    const tenantIds = [
      activeTenant?.id,
      inactiveTenant?.id,
      otherTenant?.id,
    ].filter((id): id is number => typeof id === "number");

    if (tenantIds.length > 0) {
      await prisma.tenant.deleteMany({
        where: { id: { in: tenantIds } },
      });
    }
  });

  let createdAffiliationId: number;
  let firstRevisionId: number;

  describe("1. Flujo de Solicitud (Apply)", () => {
    it("rechaza si no está autenticado", async () => {
      const res = await request(app)
        .post("/api/professionals/me/affiliations")
        .send({
          tenantId: activeTenant.id,
          content: { description: "Bio" },
        });

      expect(res.status).toBe(401);
    });

    it("rechaza si el tenant no está activo", async () => {
      const res = await request(app)
        .post("/api/professionals/me/affiliations")
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({
          tenantId: inactiveTenant.id,
          content: { description: "Bio" },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no existe o no se encuentra activo/);
    });

    it("rechaza si se envían enlaces sociales duplicados por tipo", async () => {
      const res = await request(app)
        .post("/api/professionals/me/affiliations")
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({
          tenantId: activeTenant.id,
          content: {
            description: "Bio",
            socialLinks: [
              { type: "INSTAGRAM", url: "https://instagram.com/one" },
              { type: "INSTAGRAM", url: "https://instagram.com/two" },
            ],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No se permite más de un enlace/);
    });

    it("solicita afiliación exitosamente (201 Created)", async () => {
      const res = await request(app)
        .post("/api/professionals/me/affiliations")
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({
          tenantId: activeTenant.id,
          content: {
            description: "Especialista en diagnóstico",
            socialLinks: [
              { type: "WEBSITE", url: "https://diagnosticos.com" },
            ],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.affiliation).toBeDefined();
      expect(res.body.affiliation.status).toBe("PENDING_REVIEW");
      expect(res.body.revision).toBeDefined();
      expect(res.body.revision.revisionNumber).toBe(1);

      createdAffiliationId = res.body.affiliation.id;
      firstRevisionId = res.body.revision.id;
    });

    it("rechaza duplicar la postulación (409 Conflict)", async () => {
      const res = await request(app)
        .post("/api/professionals/me/affiliations")
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({
          tenantId: activeTenant.id,
          content: { description: "Segunda solicitud" },
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Ya existe una afiliación/);
    });
  });

  describe("2. Lectura del Profesional (Read)", () => {
    it("obtiene la lista de mis afiliaciones", async () => {
      const res = await request(app)
        .get("/api/professionals/me/affiliations")
        .set("Authorization", `Bearer ${professionalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.affiliations).toBeInstanceOf(Array);
      expect(res.body.affiliations.length).toBeGreaterThanOrEqual(1);
      expect(res.body.affiliations[0].affiliation.id).toBe(createdAffiliationId);
    });

    it("obtiene mi afiliación específica por tenant", async () => {
      const res = await request(app)
        .get(`/api/professionals/me/affiliations/${activeTenant.id}`)
        .set("Authorization", `Bearer ${professionalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.affiliation.id).toBe(createdAffiliationId);
      expect(res.body.latestRevision.id).toBe(firstRevisionId);
    });
  });

  describe("3. Gestión del OWNER (List, Detail & Review)", () => {
    it("rechaza si el actor no es OWNER del tenant (ej. MEMBER)", async () => {
      const res = await request(app)
        .get("/api/tenancy/affiliations")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Tenant-ID", String(activeTenant.id));

      expect(res.status).toBe(403);
    });

    it("rechaza si el actor no envía X-Tenant-ID válido", async () => {
      const res = await request(app)
        .get("/api/tenancy/affiliations")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });

    it("permite al OWNER listar las afiliaciones del tenant", async () => {
      const res = await request(app)
        .get("/api/tenancy/affiliations")
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id));

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.items.some((i: any) => i.affiliation.id === createdAffiliationId)).toBe(true);
    });

    it("permite al OWNER consultar el detalle con auditoría", async () => {
      const res = await request(app)
        .get(`/api/tenancy/affiliations/${createdAffiliationId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id));

      expect(res.status).toBe(200);
      expect(res.body.affiliation.id).toBe(createdAffiliationId);
      expect(res.body.revisions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.auditTrail.length).toBeGreaterThanOrEqual(1);
      expect(res.body.auditTrail[0].action).toBe("APPLY");
    });

    it("rechaza si el OWNER de otro consultorio intenta revisar", async () => {
      const res = await request(app)
        .post(
          `/api/tenancy/affiliations/${createdAffiliationId}/revisions/${firstRevisionId}/review`,
        )
        .set("Authorization", `Bearer ${otherOwnerToken}`)
        .set("X-Tenant-ID", String(otherTenant.id))
        .send({ decision: "APPROVE" });

      expect(res.status).toBe(404);
    });

    it("permite al OWNER legítimo aprobar la postulación inicial", async () => {
      const res = await request(app)
        .post(
          `/api/tenancy/affiliations/${createdAffiliationId}/revisions/${firstRevisionId}/review`,
        )
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id))
        .send({ decision: "APPROVE" });

      expect(res.status).toBe(200);
      expect(res.body.affiliation.status).toBe("ACTIVE");
      expect(res.body.revision.status).toBe("APPROVED");
    });
  });

  describe("4. Proponer Contenido Versionado (Submit Content)", () => {
    let secondRevisionId: number;

    it("permite al profesional proponer una nueva revisión (v2) cuando la afiliación está ACTIVE", async () => {
      const res = await request(app)
        .post(`/api/professionals/me/affiliations/${activeTenant.id}/revisions`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({
          content: {
            description: "Descripción actualizada para el consultorio",
            socialLinks: [
              { type: "LINKEDIN", url: "https://linkedin.com/in/house" },
            ],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.revision.revisionNumber).toBe(2);
      expect(res.body.revision.status).toBe("PENDING_REVIEW");

      secondRevisionId = res.body.revision.id;
    });

    it("permite al OWNER aprobar la revisión #2 de contenido manteniendo ACTIVE la afiliación", async () => {
      const res = await request(app)
        .post(
          `/api/tenancy/affiliations/${createdAffiliationId}/revisions/${secondRevisionId}/review`,
        )
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id))
        .send({ decision: "APPROVE" });

      expect(res.status).toBe(200);
      expect(res.body.affiliation.status).toBe("ACTIVE");
      expect(res.body.revision.status).toBe("APPROVED");
      expect(res.body.revision.revisionNumber).toBe(2);
    });
  });

  describe("5. Suspensión y Reactivación", () => {
    it("rechaza suspensión sin motivo (400 Bad Request)", async () => {
      const res = await request(app)
        .post(`/api/tenancy/affiliations/${createdAffiliationId}/suspend`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id))
        .send({ reason: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Se requiere un motivo/);
    });

    it("suspende la afiliación con motivo válido", async () => {
      const res = await request(app)
        .post(`/api/tenancy/affiliations/${createdAffiliationId}/suspend`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id))
        .send({ reason: "Licencia temporal" });

      expect(res.status).toBe(200);
      expect(res.body.affiliation.status).toBe("SUSPENDED");
    });

    it("reactiva la afiliación suspendida", async () => {
      const res = await request(app)
        .post(`/api/tenancy/affiliations/${createdAffiliationId}/reactivate`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id))
        .send({ reason: "Reincorporación" });

      expect(res.status).toBe(200);
      expect(res.body.affiliation.status).toBe("ACTIVE");
    });
  });

  describe("6. Retiro (Withdraw) y Reapertura (Reopen)", () => {
    it("permite al profesional retirarse voluntariamente", async () => {
      const res = await request(app)
        .post(`/api/professionals/me/affiliations/${activeTenant.id}/withdraw`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({ reason: "Cambio de ciudad" });

      expect(res.status).toBe(200);
      expect(res.body.affiliation.status).toBe("WITHDRAWN");
    });

    it("permite al profesional reabrir una postulación retirada", async () => {
      const res = await request(app)
        .post(`/api/professionals/me/affiliations/${activeTenant.id}/reopen`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send({
          reason: "Regreso a la ciudad",
          content: {
            description: "Bio reapertura",
            socialLinks: [],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.affiliation.status).toBe("PENDING_REVIEW");
    });

    it("permite al OWNER retirar administrativamente la afiliación (con motivo)", async () => {
      const res = await request(app)
        .post(`/api/tenancy/affiliations/${createdAffiliationId}/withdraw`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Tenant-ID", String(activeTenant.id))
        .send({ reason: "Baja definitiva administrativa" });

      expect(res.status).toBe(200);
      expect(res.body.affiliation.status).toBe("WITHDRAWN");
    });
  });
});
