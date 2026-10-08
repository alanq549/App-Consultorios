import prisma from "@/shared/database/prisma";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import type { UserAccount } from "@/modules/identity/domain/account";

export class PrismaUserAccountRepository implements UserAccountRepository {

  // Busca y retorna una cuenta por su correo electrónico, o null si no existe.
  async findByEmail(email: string): Promise<UserAccount | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Si no se encuentra el usuario, retorna null.
    if (!user) {
      return null;
    }
    /// Retorna la cuenta de usuario encontrada, mapeando los campos necesarios.
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password,
      role: user.role,
      isVerified: user.isVerified,
    };
  }

  /// Busca y retorna una cuenta por su ID, o null si no existe.
  async findById(id: number): Promise<UserAccount | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    // Si no se encuentra el usuario, retorna null.
    if (!user) {
      return null;
    }

    // Retorna la cuenta de usuario encontrada, mapeando los campos necesarios.
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password,
      role: user.role,
      isVerified: user.isVerified,
    };
  }
}