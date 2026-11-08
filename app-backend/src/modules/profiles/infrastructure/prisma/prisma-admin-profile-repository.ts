/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-admin-profile-repository.ts
import prisma from "@/shared/database/prisma";
import { AdminProfileRepository } from "../../application/ports/admin-profile-repository.port";
import { AdminProfileDTO } from "../../application/dtos/admin-profile.dto";

export class PrismaAdminProfileRepository implements AdminProfileRepository {
  async findByUserId(userId: number): Promise<AdminProfileDTO | null> {
    const profile = await prisma.adminProfile.findUnique({
      where: { userId },
    });

    if (!profile) return null;

    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      lastName: profile.lastName,
      avatar: profile.avatar,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async updateAvatar(userId: number, avatar: string): Promise<void> {
    await prisma.adminProfile.update({
      where: { userId },
      data: { avatar },
    });
  }
}

