/// ARCHIVO: src/modules/identity/infrastructure/prisma-password-reset-repository.ts
/// Implementación de PasswordResetRepository utilizando Prisma ORM para gestionar tokens de restablecimiento de contraseña.

import prisma from "@/shared/database/prisma";
import type {
  PasswordReset,
  PasswordResetRepository,
} from "@/modules/identity/application/ports/password-reset-repository";

export class PrismaPasswordResetRepository
  implements PasswordResetRepository
{
  /// Registra una nueva solicitud de restablecimiento asociando el hash del token al usuario.
  async create(
    userId: number,
    tokenHash: string,
    expiresAt: Date
  ): Promise<PasswordReset> {
    const reset = await prisma.passwordReset.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
      },
    });

    return {
      id: reset.id,
      userId: reset.userId,
      token: reset.token,
      expiresAt: reset.expiresAt,
      isUsed: reset.isUsed,
    };
  }

  /// Busca una solicitud de restablecimiento válida (vigente y no consumida) a partir del hash del token.
  async findValidByToken(
    tokenHash: string,
    now: Date
  ): Promise<PasswordReset | null> {
    const reset = await prisma.passwordReset.findFirst({
      where: {
        token: tokenHash,
        isUsed: false,
        expiresAt: {
          gt: now,
        },
      },
    });

    if (!reset) {
      return null;
    }

    return {
      id: reset.id,
      userId: reset.userId,
      token: reset.token,
      expiresAt: reset.expiresAt,
      isUsed: reset.isUsed,
    };
  }

  /// Ejecuta el restablecimiento atómico de contraseña: consume el token, actualiza la credencial del usuario y revoca todas sus sesiones activas.
  async resetPassword(
    tokenHash: string,
    passwordHash: string,
    now: Date
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      // Verifica la validez y vigencia de la solicitud dentro de la transacción
      const reset = await tx.passwordReset.findFirst({
        where: {
          token: tokenHash,
          isUsed: false,
          expiresAt: {
            gt: now,
          },
        },
      });

      if (!reset) {
        return false;
      }

      // Marca el token como usado asegurando atomicidad mediante actualización condicional
      const consumed = await tx.passwordReset.updateMany({
        where: {
          id: reset.id,
          isUsed: false,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          isUsed: true,
        },
      });

      // Si ocurre una condición de carrera o no se actualizó el token, aborta la transacción
      if (consumed.count !== 1) {
        return false;
      }

      // Actualiza la contraseña del usuario con el nuevo hash
      await tx.user.update({
        where: {
          id: reset.userId,
        },
        data: {
          password: passwordHash,
        },
      });

      // Revoca todas las sesiones previas (refresh tokens) del usuario por motivos de seguridad
      await tx.refreshToken.updateMany({
        where: {
          userId: reset.userId,
        },
        data: {
          isRevoked: true,
        },
      });

      return true;
    });
  }
}