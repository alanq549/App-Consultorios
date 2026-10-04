/// ARCHIVO: src/modules/identity/infrastructure/prisma/prisma-session-repository.ts
/// Implementación con Prisma para generar y almacenar sesiones (refresh tokens) en la base de datos.

import crypto from "crypto";
import prisma from "@/shared/database/prisma";
import type {
  RotatedSession,
  Session,
  SessionRepository,
} from "@/modules/identity/application/ports/session-repository";

export class PrismaSessionRepository implements SessionRepository {
  /// Genera un token aleatorio, guarda su hash en la base de datos por seguridad y retorna la sesión con el token en texto plano.
  async createSession(userId: number): Promise<Session> {
    // Genera una cadena aleatoria de 64 bytes codificada en hexadecimal
    const token = crypto.randomBytes(64).toString("hex");

    // Aplica SHA-256 para guardar solo el hash en la base de datos y prevenir robos de sesión si la DB se compromete
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Define la expiración del token a 30 días a partir de la fecha actual
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );

    // Registra la nueva sesión en la tabla refreshToken de Prisma
    const session = await prisma.refreshToken.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      token, // Retorna el token original (sin hash) para entregarlo al cliente
      expiresAt: session.expiresAt,
    };
  }

  /// Rotación atómica de sesión resistente a concurrencia
  async rotateSession(
    tokenHash: string,
    now: Date
  ): Promise<RotatedSession | null> {
    return prisma.$transaction(async (tx) => {
      // 1, 2 y 3. Buscar el refresh token por hash, asegurando que esté activo y no expirado
      const stored = await tx.refreshToken.findFirst({
        where: {
          token: tokenHash,
          isRevoked: false,
          expiresAt: { gt: now },
        },
        // 4. Obtener el usuario necesario para crear las credenciales
        include: { user: true },
      });

      if (!stored) {
        return null;
      }

      // 5 y 6. Revocación condicional atómica para evitar colisiones concurrentes
      const updateResult = await tx.refreshToken.updateMany({
        where: {
          id: stored.id,
          isRevoked: false,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          isRevoked: true,
        },
      });

      if (updateResult.count !== 1) {
        return null;
      }

      // 7. Generar nuevo refresh token
      const newRefreshToken = crypto.randomBytes(64).toString("hex");

      // 8. Guardar únicamente su hash
      const newRefreshTokenHash = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      const newExpiresAt = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      const newSession = await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          token: newRefreshTokenHash,
          expiresAt: newExpiresAt,
        },
      });

      // 9. Retornar respetando la estructura del tipo RotatedSession
      return {
        session: {
          id: newSession.id,
          userId: newSession.userId,
          token: newRefreshToken, // Token en texto plano
          expiresAt: newSession.expiresAt,
        },
        actor: {
          id: stored.user.id,
          role: stored.user.role,
        },
      };
    });
  }
}