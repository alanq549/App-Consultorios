/// ARCHIVO: tests/auth/register.test.ts
/// Pruebas de integración para el servicio de registro de usuarios (AuthService.register).
///
/// Propósito: Validar la creación e inicialización de cuentas de usuario en la base de datos:
/// - Registro de rol CLIENT (hash bcrypt de contraseña, perfil cliente, configuración personalizada y token de verificación).
/// - Registro de rol PROFESSIONAL (vinculación de perfil profesional y especialidad asociada en estado PENDING).
/// - Garantía de seguridad en la respuesta (mantenimiento del contrato público sin exponer 'password').
/// - Prevención de duplicados con respuesta de conflicto HTTP 409.
/// - Atomicidad transaccional y rollback ante errores de relación (especialidad inexistente).
/// - Disparo de efectos secundarios (envío de correos de verificación y notificaciones de bienvenida).

import { describe, expect, it, beforeEach, vi } from "vitest";
import bcrypt from "bcrypt";
import prisma from "@/shared/database/prisma";
import { AuthService } from "@/modules/auth/auth.service";
import { sendVerificationEmail } from "@/modules/auth/auth.mail";
import { NotificationService } from "@/modules/notifications/notifications.service";
import request from "supertest";
import app from "@/app";

// Mocks de servicios secundarios externos para evitar el envío real de correos o notificaciones durante las pruebas
vi.mock("@/modules/auth/auth.mail", () => ({
  sendVerificationEmail: vi.fn(),
  sendResetPasswordEmail: vi.fn(),
}));

vi.mock("@/modules/notifications/notifications.service", () => ({
  NotificationService: {
    notifyWelcome: vi.fn(),
  },
}));

describe("AuthService.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /// Valida el flujo completo de registro para un cliente: persistencia, hashing de clave, inicialización de datos y notificaciones.
  it("registra un CLIENT y devuelve únicamente el contrato público", async () => {
    const email = `register-client-${Date.now()}@test.com`;

    const result = await AuthService.register({
      role: "CLIENT",
      email,
      password: "Password123!",
      profile: {
        name: "Alan",
        lastName: "Arriaga",
        phone: "5555555555",
      },
    });

    expect(result).toMatchObject({
      email,
      role: "CLIENT",
      isVerified: false,
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");

    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("token");
    expect(result).not.toHaveProperty("verificationToken");

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user).not.toBeNull();
    expect(user?.password).not.toBe("Password123!");
    expect(await bcrypt.compare("Password123!", user!.password)).toBe(true);

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: user!.id },
    });

    expect(profile).not.toBeNull();

    const config = await prisma.customConfig.findUnique({
      where: { userId: user!.id },
    });

    expect(config).not.toBeNull();

    const verification = await prisma.verificationAttempt.findFirst({
      where: { userId: user!.id },
    });

    expect(verification).not.toBeNull();

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(NotificationService.notifyWelcome).toHaveBeenCalledTimes(1);
  });

  /// Verifica la creación del perfil profesional y la asignación inicial de su especialidad con estado 'PENDING'.
  it("registra un PROFESSIONAL con su specialty", async () => {
    const email = `register-professional-${Date.now()}@test.com`;

    const specialty = await prisma.specialty.create({
      data: {
        name: `Specialty ${Date.now()}`,
        description: "Test specialty",
      },
    });

    const result = await AuthService.register({
      role: "PROFESSIONAL",
      email,
      password: "Password123!",
      profile: {
        name: "Alan",
        lastName: "Arriaga",
        phone: "5555555555",
        specialtyId: specialty.id,
        description: "Professional test",
      },
    });

    expect(result).toMatchObject({
      email,
      role: "PROFESSIONAL",
      isVerified: false,
    });

    expect(result).not.toHaveProperty("password");

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user).not.toBeNull();

    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: user!.id },
    });

    expect(profile).not.toBeNull();

    const professionalSpecialty =
      await prisma.professionalSpecialty.findUnique({
        where: {
          professionalId_specialtyId: {
            professionalId: profile!.id,
            specialtyId: specialty.id,
          },
        },
      });

    expect(professionalSpecialty).not.toBeNull();
    expect(professionalSpecialty?.status).toBe("PENDING");
  });

  /// Garantiza la privacidad de los datos sensibles omitiendo la propiedad 'password' del DTO retornado.
  it("no expone el hash de contraseña en la respuesta", async () => {
    const email = `register-password-${Date.now()}@test.com`;

    const result = await AuthService.register({
      role: "CLIENT",
      email,
      password: "Password123!",
      profile: {
        name: "Alan",
      },
    });

    expect(Object.keys(result)).toEqual(
      expect.arrayContaining([
        "id",
        "email",
        "role",
        "isVerified",
        "createdAt",
        "updatedAt",
      ]),
    );

    expect(Object.keys(result)).not.toContain("password");
  });

  /// Comprueba la restricción de unicidad lanzando una excepción con código HTTP 409 si el correo ya existe.
  it("rechaza un correo ya registrado con 409", async () => {
    const email = `register-duplicate-${Date.now()}@test.com`;

    await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash("Password123!", 10),
        role: "CLIENT",
      },
    });

    await expect(
      AuthService.register({
        role: "CLIENT",
        email,
        password: "Password123!",
        profile: {
          name: "Alan",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Correo ya registrado",
    });
  });

  /// Confirma la integridad referencial y atomicidad: revierte toda la transacción si la especialidad especificada no existe.
  it("hace rollback cuando un PROFESSIONAL usa una specialty inexistente", async () => {
    const email = `register-rollback-${Date.now()}@test.com`;

    await expect(
      AuthService.register({
        role: "PROFESSIONAL",
        email,
        password: "Password123!",
        profile: {
          name: "Alan",
          specialtyId: 999999999,
        },
      }),
    ).rejects.toThrow("Specialty inválida");

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user).toBeNull();
  });


  /// Verifica que la ruta HTTP POST /api/auth/register cumpla con el contrato público y no exponga datos sensibles.
    it("POST /api/auth/register devuelve únicamente el contrato público", async () => {
    const email = `register-http-${Date.now()}@test.com`;

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        role: "CLIENT",
        email,
        password: "Password123!",
        profile: {
          name: "Alan",
          lastName: "Arriaga",
          phone: "5555555555",
        },
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      email,
      role: "CLIENT",
      isVerified: false,
    });

    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("createdAt");
    expect(response.body).toHaveProperty("updatedAt");

    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("token");
    expect(response.body).not.toHaveProperty("verificationToken");

    const serializedResponse = JSON.stringify(response.body);

    expect(serializedResponse).not.toContain("Password123!");
    expect(serializedResponse).not.toContain("password");
  });
});