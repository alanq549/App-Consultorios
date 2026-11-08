/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-user-identity-reader.ts
import prisma from "@/shared/database/prisma";
import {
  UserIdentityReader,
  UserIdentitySummary,
} from "../../application/ports/user-identity-reader.port";

export class PrismaUserIdentityReader implements UserIdentityReader {
  async findById(userId: number): Promise<UserIdentitySummary | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        role: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
    };
  }
}

