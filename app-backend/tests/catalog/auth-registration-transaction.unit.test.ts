/// ARCHIVO: tests/catalog/auth-registration-transaction.unit.test.ts
/// Pruebas unitarias de la frontera transaccional Auth -> Catalog.
///
/// Propósito: Validar a nivel unitario la coordinación transaccional entre AuthService.register
/// y CatalogTaxonomyService, garantizando:
/// 1. Que el cliente transaccional se propague a Catalog envuelto en la abstracción compartida (createPrismaTransactionContext).
/// 2. Que la consulta de taxonomía se ejecute sobre el txClient dentro de la transacción interactiva.
/// 3. Que el registro exitoso asigne la especialidad PENDING sobre el txClient.
/// 4. Que ante especialidad inexistente o inactiva, se lance el error "Specialty inválida"
///    interrumpiendo la ejecución e impidiendo la creación del perfil profesional (fail-fast / aborto).
/// 5. Que un cliente transaccional crudo sin envolver sea rechazado explícitamente por el adaptador.
///
/// Nota metodológica: Estas pruebas son unitarias (mocks sobre prisma.$transaction);
/// validan el flujo de control, la delegación sobre el txClient y la interrupción del callback.
/// No constituyen una verificación de rollback a nivel de motor PostgreSQL físico.

import { describe, expect, it, vi, beforeEach } from "vitest";
import prisma from "@/shared/database/prisma";
import { AuthService } from "@/modules/auth/auth.service";
import { createPrismaTransactionContext } from "@/shared/database/prisma-transaction-context";
import {
  extractPrismaClient,
  CatalogTransactionError,
} from "@/modules/catalog/infrastructure/prisma/prisma-transaction-context";
import { CatalogTaxonomyService } from "@/modules/catalog/infrastructure/catalog-taxonomy.service";
import { PrismaSpecialtyRepository } from "@/modules/catalog/infrastructure/prisma/prisma-specialty-repository";

// Mocks de efectos secundarios de auth (emails y notificaciones)
vi.mock("@/modules/auth/auth.mail", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/notifications/notifications.service", () => ({
  NotificationService: {
    notifyWelcome: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Frontera transaccional Auth -> Catalog — Pruebas unitarias de coordinación (Misión 1 - Fase 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.injectDependencies({
      catalogTaxonomy: new CatalogTaxonomyService(new PrismaSpecialtyRepository()),
    });
  });

  it("registra un PROFESSIONAL delegando la validación de taxonomía sobre el cliente transaccional", async () => {
    const mockTxSpecialtyFindUnique = vi.fn().mockResolvedValue({
      id: 5,
      name: "Dermatología",
      description: "Cuidado de la piel",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockTxUserCreate = vi.fn().mockResolvedValue({
      id: 42,
      email: "prof-tx@test.com",
      role: "PROFESSIONAL",
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockTxProfileCreate = vi.fn().mockResolvedValue({
      id: 88,
      userId: 42,
      name: "Elena",
      lastName: "Rostova",
    });

    const mockTxVerificationCreate = vi.fn().mockResolvedValue({
      id: 1,
      userId: 42,
      token: "verify_token_123",
    });

    // Simulamos el cliente transaccional de Prisma
    const mockTxClient = {
      user: { create: mockTxUserCreate },
      specialty: { findUnique: mockTxSpecialtyFindUnique },
      professionalProfile: { create: mockTxProfileCreate },
      verificationAttempt: { create: mockTxVerificationCreate },
      customConfig: { create: vi.fn().mockResolvedValue({ id: 1 }) },
    };

    // Espiamos prisma.$transaction para inyectar mockTxClient
    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementation(async (callback: any) => {
        return callback(mockTxClient);
      });

    // Mockeamos la búsqueda de usuario existente (duplicados) en el cliente raíz
    const findUniqueUserSpy = vi
      .spyOn(prisma.user, "findUnique")
      .mockResolvedValue(null);

    const result = await AuthService.register({
      role: "PROFESSIONAL",
      email: "prof-tx@test.com",
      password: "Password123!",
      profile: {
        name: "Elena",
        lastName: "Rostova",
        phone: "5551234567",
        specialtyId: 5,
        description: "Especialista en dermatología clínica",
      },
    });

    // 1. La transacción fue invocada
    expect(transactionSpy).toHaveBeenCalledTimes(1);

    // 2. La consulta de specialty se ejecutó SOBRE EL CLIENTE TRANSACCIONAL (mockTxClient),
    // comprobando que participó en el contexto de transacción interactiva
    expect(mockTxSpecialtyFindUnique).toHaveBeenCalledTimes(1);
    expect(mockTxSpecialtyFindUnique).toHaveBeenCalledWith({
      where: { id: 5 },
    });

    // 3. El perfil profesional y la especialidad PENDING se crearon dentro del tx
    expect(mockTxProfileCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 42,
          specialties: {
            create: {
              specialtyId: 5,
              status: "PENDING",
            },
          },
        }),
      }),
    );

    // 4. El registro devolvió el contrato público sin password
    expect(result).toMatchObject({
      email: "prof-tx@test.com",
      role: "PROFESSIONAL",
      isVerified: false,
    });
    expect(result).not.toHaveProperty("password");

    findUniqueUserSpy.mockRestore();
    transactionSpy.mockRestore();
  });

  it("interrumpe el flujo transaccional con 'Specialty inválida' si la especialidad no existe, sin crear el perfil profesional", async () => {
    const mockTxSpecialtyFindUnique = vi.fn().mockResolvedValue(null);
    const mockTxUserCreate = vi.fn().mockResolvedValue({
      id: 43,
      email: "prof-invalid@test.com",
      role: "PROFESSIONAL",
    });
    const mockTxProfileCreate = vi.fn();

    const mockTxClient = {
      user: { create: mockTxUserCreate },
      specialty: { findUnique: mockTxSpecialtyFindUnique },
      professionalProfile: { create: mockTxProfileCreate },
      verificationAttempt: { create: vi.fn() },
      customConfig: { create: vi.fn() },
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      return callback(mockTxClient);
    });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(
      AuthService.register({
        role: "PROFESSIONAL",
        email: "prof-invalid@test.com",
        password: "Password123!",
        profile: {
          name: "Carlos",
          lastName: "Mendoza",
          phone: "5559876543",
          specialtyId: 999,
        },
      }),
    ).rejects.toThrow("Specialty inválida");

    // specialty fue consultado sobre el tx client
    expect(mockTxSpecialtyFindUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });

    // Se asegura que no se continuó con la creación del perfil profesional
    expect(mockTxProfileCreate).not.toHaveBeenCalled();
  });

  it("interrumpe el flujo transaccional con 'Specialty inválida' si la especialidad existe pero está inactiva, sin crear el perfil", async () => {
    const mockTxSpecialtyFindUnique = vi.fn().mockResolvedValue({
      id: 8,
      name: "Especialidad Desactivada",
      isActive: false,
    });
    const mockTxUserCreate = vi.fn().mockResolvedValue({
      id: 44,
      email: "prof-inactive@test.com",
      role: "PROFESSIONAL",
    });
    const mockTxProfileCreate = vi.fn();

    const mockTxClient = {
      user: { create: mockTxUserCreate },
      specialty: { findUnique: mockTxSpecialtyFindUnique },
      professionalProfile: { create: mockTxProfileCreate },
      verificationAttempt: { create: vi.fn() },
      customConfig: { create: vi.fn() },
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      return callback(mockTxClient);
    });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(
      AuthService.register({
        role: "PROFESSIONAL",
        email: "prof-inactive@test.com",
        password: "Password123!",
        profile: {
          name: "Carlos",
          lastName: "Mendoza",
          phone: "5559876543",
          specialtyId: 8,
        },
      }),
    ).rejects.toThrow("Specialty inválida");

    expect(mockTxProfileCreate).not.toHaveBeenCalled();
  });

  it("demuestra que una falla en la validación descarta mutaciones pendientes (rollback simulado en memoria)", async () => {
    const stagedUsers: string[] = [];
    const transactionEvents: string[] = [];

    const mockTxClient = {
      user: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          transactionEvents.push(`user_created:${data.email}`);
          stagedUsers.push(data.email);
          return { id: 99, email: data.email, role: data.role };
        }),
      },
      specialty: {
        findUnique: vi.fn().mockResolvedValue(null), // specialty no existe
      },
      professionalProfile: { create: vi.fn() },
      verificationAttempt: { create: vi.fn() },
      customConfig: { create: vi.fn() },
    };

    // Simulador de transacción con política de rollback ante rechazo
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      try {
        return await callback(mockTxClient);
      } catch (err) {
        // En caso de excepción, la transacción de Prisma descarta todas las mutaciones
        stagedUsers.length = 0;
        transactionEvents.push("rollback_executed");
        throw err;
      }
    });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(
      AuthService.register({
        role: "PROFESSIONAL",
        email: "rollback-sim@test.com",
        password: "Password123!",
        profile: {
          name: "Test",
          lastName: "Simulado",
          phone: "5550001111",
          specialtyId: 9999,
        },
      }),
    ).rejects.toThrow("Specialty inválida");

    // Valida que el rollback simulado descartó el usuario creado previamente
    expect(stagedUsers).toHaveLength(0);
    expect(transactionEvents).toContain("rollback_executed");
    expect(mockTxClient.professionalProfile.create).not.toHaveBeenCalled();
  });

  it("rechaza explícitamente con CatalogTransactionError si se pasa un txClient crudo sin el adaptador sellado", () => {
    const rawTxClient = { specialty: { findUnique: vi.fn() } } as any;

    expect(() => extractPrismaClient(rawTxClient)).toThrow(CatalogTransactionError);

    // Con el adaptador transversal compartido, sí es reconocido
    const wrapped = createPrismaTransactionContext(rawTxClient);
    expect(extractPrismaClient(wrapped as any)).toBe(rawTxClient);
  });
});

