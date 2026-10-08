/// ARCHIVO: src/modules/identity/infrastructure/adapters/prisma-password-change-repository.ts
/// Adaptador que implementa el repositorio de cambio de contraseña utilizando Prisma.

import prisma from "@/shared/database/prisma";
import type { PasswordChangeRepository } from "@/modules/identity/application/ports/password-change-repository";

export class PrismaPasswordChangeRepository
  implements PasswordChangeRepository
{
  /// Actualiza la contraseña del usuario y revoca todos sus tokens de refresco activos dentro de una transacción.
  async changePassword(
    userId: number,
    passwordHash: string
  ): Promise<void> {
    await prisma.$transaction([
      // Actualiza la contraseña hash del usuario correspondiente al ID.
      prisma.user.update({
        where: { id: userId },
        data: {
          password: passwordHash,
        },
      }),

      // Invalida todos los tokens de refresco asociados al usuario por seguridad.
      prisma.refreshToken.updateMany({
        where: {
          userId,
        },
        data: {
          isRevoked: true,
        },
      }),
    ]);
  }
}