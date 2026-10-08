/// ARCHIVO: tests/identity/password-change-repository.test.ts
/// Pruebas de integración para la implementación en Prisma del repositorio de cambio de contraseña (PrismaPasswordChangeRepository).

import { randomUUID } from "node:crypto";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { PrismaPasswordChangeRepository } from "@/modules/identity/infrastructure/prisma/prisma-password-change-repository";
import prisma from "@/shared/database/prisma";

// Instancia del repositorio a probar
const repository = new PrismaPasswordChangeRepository();

describe("PrismaPasswordChangeRepository", () => {
  let userId: number;

  // Crea un usuario de prueba en la base de datos antes de cada caso de prueba
  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `password-change-test-${randomUUID()}@example.com`,
        password: "old-password-hash",
      },
    });

    userId = user.id;
  });

  // Limpia los datos de prueba eliminando el usuario creado al finalizar cada prueba
  afterEach(async () => {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  });

  /// Verifica que se actualice correctamente la contraseña del usuario en la base de datos.
  it("actualiza la contraseña del usuario", async () => {
    // Executa la actualización de contraseña
    await repository.changePassword(
      userId,
      "new-password-hash",
    );

    // Consulta el estado actualizado del usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    // Confirma que el hash de la contraseña fue modificado
    expect(user?.password).toBe("new-password-hash");
  });

  /// Verifica que se revoquen (marquen como isRevoked) todos los refresh tokens asociados al usuario.
  it("revoca todos los refresh tokens del usuario", async () => {
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    // Crea múltiples tokens de refresco activos para el usuario
    await prisma.refreshToken.createMany({
      data: [
        {
          userId,
          token: randomUUID(),
          expiresAt,
        },
        {
          userId,
          token: randomUUID(),
          expiresAt,
        },
      ],
    });

    // Executa el cambio de contraseña
    await repository.changePassword(
      userId,
      "new-password-hash",
    );

    // Consulta los tokens del usuario para verificar su estado
    const refreshTokens = await prisma.refreshToken.findMany({
      where: {
        userId,
      },
    });

    // Confirma que existen los 2 tokens y que ambos se encuentran revocados
    expect(refreshTokens).toHaveLength(2);
    expect(
      refreshTokens.every((token) => token.isRevoked),
    ).toBe(true);
  });

  /// Verifica que la contraseña se actualice y las sesiones se revoquen de forma atómica en una sola operación.
  it("actualiza la contraseña y revoca las sesiones en una sola operación", async () => {
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    // Crea un token de refresco asociado
    await prisma.refreshToken.create({
      data: {
        userId,
        token: randomUUID(),
        expiresAt,
      },
    });

    // Executa la transacción de cambio de contraseña
    await repository.changePassword(
      userId,
      "transaction-password-hash",
    );

    // Consulta el estado final del usuario y sus tokens de refresco
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    const refreshTokens = await prisma.refreshToken.findMany({
      where: {
        userId,
      },
    });

    // Valida que ambos cambios persistan correctamente en la base de datos
    expect(user?.password).toBe(
      "transaction-password-hash",
    );

    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0].isRevoked).toBe(true);
  });
});