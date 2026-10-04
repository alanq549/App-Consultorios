/// ARCHIVO: src/modules/identity/infrastructure/prisma/prisma-user-account-repository.ts
/// Implementación con Prisma del repositorio de cuentas de usuario para consultar la base de datos.

import prisma from "@/shared/database/prisma";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import type { UserAccount } from "@/modules/identity/domain/account";

export class PrismaUserAccountRepository implements UserAccountRepository {
  /// Consulta un usuario en la tabla `user` por su correo y mapea el resultado a la entidad de dominio `UserAccount`.
  async findByEmail(email: string): Promise<UserAccount | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // Mapea el modelo de Prisma al objeto de dominio deseado (ej. mapea `password` a `passwordHash`)
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password,
      role: user.role,
      isVerified: user.isVerified,
    };
  }
}