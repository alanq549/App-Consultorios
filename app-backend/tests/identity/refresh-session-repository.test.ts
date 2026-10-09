/// ARCHIVO: tests/identity/prisma-session-repository.test.ts
/// Pruebas de integración para PrismaSessionRepository usando Vitest y Prisma ORM.
///
/// Propósito: Validar la rotación concurrente y segura de tokens de sesión (refresh tokens):
/// - Garantizar la atomicidad y consistencia en solicitudes concurrentes usando el mismo token.
/// - Asegurar la revocación inmediata del token original utilizado.
/// - Verificar la creación de una única nueva sesión activa tras la rotación.

import { randomUUID } from "node:crypto";
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { PrismaSessionRepository } from "@/modules/identity/infrastructure/prisma/prisma-session-repository";
import prisma from "@/shared/database/prisma";

describe("PrismaSessionRepository", () => {
  const repository = new PrismaSessionRepository();

  /// Verifica la protección contra ataques de reintervención/concurrencia permitiendo únicamente
  /// una rotación exitosa cuando dos solicitudes simultanéas intentan usar el mismo refresh token.
  it("solo permite una rotación cuando dos solicitudes concurrentes usan el mismo refresh token", async () => {
    const user = await prisma.user.create({
      data: {
        email: `refresh-concurrency-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "CLIENT",
        isVerified: true,
      },
    });

    try {
      const originalRefreshToken = crypto.randomBytes(64).toString("hex");

      const originalTokenHash = crypto
        .createHash("sha256")
        .update(originalRefreshToken)
        .digest("hex");

      const expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );

      const originalSession = await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: originalTokenHash,
          expiresAt,
          isRevoked: false,
        },
      });

      const now = new Date();

      const [first, second] = await Promise.all([
        repository.rotateSession(originalTokenHash, now),
        repository.rotateSession(originalTokenHash, now),
      ]);

      const results = [first, second];

      expect(results.filter((result) => result !== null)).toHaveLength(1);
      expect(results.filter((result) => result === null)).toHaveLength(1);

      const originalToken = await prisma.refreshToken.findUnique({
        where: {
          id: originalSession.id,
        },
      });

      expect(originalToken).not.toBeNull();
      expect(originalToken?.isRevoked).toBe(true);

      const sessions = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
        },
      });

      expect(sessions).toHaveLength(2);

      const rotatedSessions = sessions.filter(
        (session) => session.id !== originalSession.id,
      );

      expect(rotatedSessions).toHaveLength(1);
      expect(rotatedSessions[0].isRevoked).toBe(false);
    } finally {
      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });
    }
  });
});