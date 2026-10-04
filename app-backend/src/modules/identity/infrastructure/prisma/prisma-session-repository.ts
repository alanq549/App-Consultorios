/// ARCHIVO: src/modules/identity/infrastructure/prisma/prisma-session-repository.ts
/// Implementación con Prisma para generar y almacenar sesiones (refresh tokens) en la base de datos.

import crypto from "crypto";
import prisma from "@/shared/database/prisma";
import type {
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
}