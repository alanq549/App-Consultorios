/// ARCHIVO: src/modules/identity/infrastructure/prisma-verification-repository.ts
/// Implementación de VerificationRepository utilizando Prisma ORM para gestionar la verificación de cuentas.

import prisma from "@/shared/database/prisma";
import type { VerificationRepository, VerifiedAccount } from "../../application/ports/verification-repository";

export class PrismaVerificationRepository
  implements VerificationRepository {
  /// Verifica la dirección de correo de un usuario mediante la validación y consumo atómico de un token.
  async verifyEmail(
    tokenHash: string,
    now: Date
  ): Promise<VerifiedAccount | null> {
    // Ejecuta todas las operaciones dentro de una transacción para garantizar consistencia atómica
    return prisma.$transaction(async (tx) => {
      // Busca un intento de verificación válido (no usado y que no haya expirado)
      const attempt = await tx.verificationAttempt.findFirst({
        where: {
          token: tokenHash,
          isUsed: false,
          expiresAt: {
            gt: now,
          },
        },
      });

      // Retorna null si el token no existe, ya fue utilizado o ha expirado
      if (!attempt) {
        return null;
      }

      // Busca la cuenta del usuario asociada al token
      const user = await tx.user.findUnique({
        where: {
          id: attempt.userId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
        },
      });

      // Retorna null si el usuario no existe o si la cuenta ya había sido verificada
      if (!user || user.isVerified) {
        return null;
      }

      // Marca el token como consumido asegurando atomicidad mediante actualización condicional
      const consumed = await tx.verificationAttempt.updateMany({
        where: {
          id: attempt.id,
          userId: attempt.userId,
          isUsed: false,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          isUsed: true,
        },
      });

      // Si no se pudo actualizar exactamente un registro (concurrencia/race condition), aborta
      if (consumed.count !== 1) {
        return null;
      }

      // Actualiza el estado del usuario marcándolo como verificado
      const verifiedUser = await tx.user.update({
        where: {
          id: attempt.userId,
        },
        data: {
          isVerified: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
        },
      });

      // Retorna la entidad de dominio mapeada
     return verifiedUser;
    });
  }
}