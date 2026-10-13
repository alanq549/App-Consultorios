/// ARCHIVO: tests/tenancy/tenancy.http.test.ts
/// Pruebas de integración HTTP para el endpoint GET /api/tenancy/current.
///
/// Propósito: Validar de extremo a extremo (E2E / HTTP) el comportamiento de selección y contexto de tenant:
/// - Creación y limpieza determinista de datos de prueba en la base de datos (Tenants, Usuarios, Membresías).
/// - Verificación de autorización por roles y estados (`ACTIVE`, `SUSPENDED`).
/// - Validación estricta del encabezado `X-Tenant-ID` (casos de éxito y valores inválidos/malformados).
/// - Aislamiento multi-tenant entre usuarios y acceso a múltiples tenants.

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

/// Mensajes esperados en las respuestas de error de la API.
const ACCESS_DENIED_MESSAGE =
  "Tenant context unavailable or access denied";

const INVALID_SELECTOR_MESSAGE =
  "Tenant selector header 'X-Tenant-ID' is required and must be a valid positive integer.";

// Servicio real para firmar tokens JWT durante las pruebas.
const tokenService = new JwtAccessTokenService();

// Sufijo único para garantizar el aislamiento de datos por cada ejecución del test runner.
const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;

// Correos de prueba con dominio ficticio y sufijo aleatorio.
const emails = {
  onlyA: `tenancy-only-a-${suffix}@test.invalid`,
  onlyB: `tenancy-only-b-${suffix}@test.invalid`,
  both: `tenancy-both-${suffix}@test.invalid`,
  suspended: `tenancy-suspended-${suffix}@test.invalid`,
  admin: `tenancy-admin-${suffix}@test.invalid`,
};

type TestActor = {
  id: number;
  token: string;
};

// Registro dinámico de actores (usuario ID + JWT) mapeados por correo.
const actors: Record<keyof typeof emails, TestActor> = {} as Record<
  keyof typeof emails,
  TestActor
>;

let tenantA: { id: number; name: string; slug: string };
let tenantB: { id: number; name: string; slug: string };

describe("GET /api/tenancy/current", () => {
  /// Prepara la base de datos seeding datos temporales (Tenants, Users, Memberships)
  /// y generando los tokens JWT correspondientes para las peticiones.
  beforeAll(async () => {
    // 1. Crear los tenants de prueba A y B.
    tenantA = await prisma.tenant.create({
      data: {
        name: "Tenancy Test A",
        slug: `tenancy-test-a-${suffix}`,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: "Tenancy Test B",
        slug: `tenancy-test-b-${suffix}`,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    // 2. Crear los usuarios de prueba en la base de datos.
    const onlyA = await prisma.user.create({
      data: {
        email: emails.onlyA,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });

    const onlyB = await prisma.user.create({
      data: {
        email: emails.onlyB,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });

    const both = await prisma.user.create({
      data: {
        email: emails.both,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });

    const suspended = await prisma.user.create({
      data: {
        email: emails.suspended,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });

    const admin = await prisma.user.create({
      data: {
        email: emails.admin,
        password: "test-password-hash",
        role: "ADMIN",
      },
      select: { id: true },
    });

    // 3. Crear las membresías deterministas de los usuarios con sus respectivos tenants.
    await prisma.tenantMembership.createMany({
      data: [
        {
          userId: onlyA.id,
          tenantId: tenantA.id,
          role: "OWNER",
          status: "ACTIVE",
        },
        {
          userId: onlyB.id,
          tenantId: tenantB.id,
          role: "OWNER",
          status: "ACTIVE",
        },
        {
          userId: both.id,
          tenantId: tenantA.id,
          role: "OWNER",
          status: "ACTIVE",
        },
        {
          userId: both.id,
          tenantId: tenantB.id,
          role: "MEMBER",
          status: "ACTIVE",
        },
        {
          userId: suspended.id,
          tenantId: tenantA.id,
          role: "MEMBER",
          status: "SUSPENDED",
        },
      ],
    });

    // 4. Firmar tokens de acceso válidos utilizando el servicio de Identity.
    actors.onlyA = {
      id: onlyA.id,
      token: tokenService.sign({
        id: onlyA.id,
        role: "CLIENT",
      }),
    };

    actors.onlyB = {
      id: onlyB.id,
      token: tokenService.sign({
        id: onlyB.id,
        role: "CLIENT",
      }),
    };

    actors.both = {
      id: both.id,
      token: tokenService.sign({
        id: both.id,
        role: "CLIENT",
      }),
    };

    actors.suspended = {
      id: suspended.id,
      token: tokenService.sign({
        id: suspended.id,
        role: "CLIENT",
      }),
    };

    actors.admin = {
      id: admin.id,
      token: tokenService.sign({
        id: admin.id,
        role: "ADMIN",
      }),
    };
  });

  /// Limpia los registros creados durante la prueba respetando las llaves foráneas.
  afterAll(async () => {
    // Borrar los tenants elimina automáticamente sus membresías (ON DELETE CASCADE).
    if (tenantA?.id && tenantB?.id) {
      await prisma.tenant.deleteMany({
        where: {
          id: { in: [tenantA.id, tenantB.id] },
        },
      });
    }

    // Borrar los usuarios creados para los tests.
    await prisma.user.deleteMany({
      where: {
        email: { in: Object.values(emails) },
      },
    });
  });

  it("devuelve 200 para una membership activa en Tenant A", async () => {
    const response = await request(app)
      .get("/api/tenancy/current")
      .set("Authorization", `Bearer ${actors.onlyA.token}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      tenant: {
        id: tenantA.id,
        name: tenantA.name,
        slug: tenantA.slug,
        status: "ACTIVE",
      },
      membership: {
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    // Valida que joinedAt sea una fecha ISO formateada correctamente.
    expect(response.body.membership.joinedAt).toEqual(
      expect.any(String),
    );
    expect(Number.isNaN(Date.parse(response.body.membership.joinedAt)))
      .toBe(false);
  });

  it("deniega el acceso cuando un usuario de A intenta seleccionar B", async () => {
    const response = await request(app)
      .get("/api/tenancy/current")
      .set("Authorization", `Bearer ${actors.onlyA.token}`)
      .set("X-Tenant-ID", String(tenantB.id));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: ACCESS_DENIED_MESSAGE,
    });
  });

  it("deniega una membership SUSPENDED", async () => {
    const response = await request(app)
      .get("/api/tenancy/current")
      .set("Authorization", `Bearer ${actors.suspended.token}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: ACCESS_DENIED_MESSAGE,
    });
  });

  /// Prueba de seguridad: Verifica que un usuario ADMIN sin membership no pueda acceder a tenants arbitrarios.
  it("devuelve 401 cuando no hay token de autenticación", async () => {
    const response = await request(app)
      .get("/api/tenancy/current")
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Token requerido",
    });
  });


  it("deniega a ADMIN cuando no tiene membership", async () => {
    const response = await request(app)
      .get("/api/tenancy/current")
      .set("Authorization", `Bearer ${actors.admin.token}`)
      .set("X-Tenant-ID", String(tenantA.id));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: ACCESS_DENIED_MESSAGE,
    });
  });

  it("devuelve la denegación uniforme para un tenant inexistente", async () => {
    const response = await request(app)
      .get("/api/tenancy/current")
      .set("Authorization", `Bearer ${actors.onlyA.token}`)
      .set("X-Tenant-ID", "2147483647");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: ACCESS_DENIED_MESSAGE,
    });
  });

  /// Prueba parametrizada que valida todas las variantes inválidas de la cabecera 'X-Tenant-ID'.

  it.each([
    ["header ausente", undefined],
    ["texto", "abc"],
    ["cero", "0"],
    ["número negativo", "-1"],
    ["decimal", "1.5"],
    ["entero fuera del rango seguro", "9007199254740992"],
    ["entero fuera del rango de PostgreSQL INTEGER", "2147483648"],
  ])("devuelve 400 cuando el selector es inválido (%s)", async (_, value) => {
    const req = request(app).get("/api/tenancy/current");

    req.set("Authorization", `Bearer ${actors.onlyA.token}`);

    if (value !== undefined) {
      req.set("X-Tenant-ID", value);
    }

    const response = await req;

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: INVALID_SELECTOR_MESSAGE,
    });
  });


  it("permite seleccionar A y B por separado cuando el usuario tiene ambas memberships", async () => {
    const responseA = await request(app)
      .get("/api/tenancy/current")
      .set("Authorization", `Bearer ${actors.both.token}`)
      .set("X-Tenant-ID", String(tenantA.id));

    const responseB = await request(app)
      .get("/api/tenancy/current")
      .set("Authorization", `Bearer ${actors.both.token}`)
      .set("X-Tenant-ID", String(tenantB.id));

    expect(responseA.status).toBe(200);
    expect(responseA.body.tenant.id).toBe(tenantA.id);
    expect(responseA.body.membership.role).toBe("OWNER");

    expect(responseB.status).toBe(200);
    expect(responseB.body.tenant.id).toBe(tenantB.id);
    expect(responseB.body.membership.role).toBe("MEMBER");
  });


});