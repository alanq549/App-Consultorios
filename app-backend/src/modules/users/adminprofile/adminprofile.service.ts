// src/modules/users/adminprofile/adminprofile.service.ts
import prisma from "@/core/prisma";

export class AdminProfileService {

  static async findByUserId(userId: number) {
    return prisma.adminProfile.findUnique({
      where: { userId },
    });
  }

  static async me(userId: number) {
    const profile = await prisma.adminProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new Error("Perfil admin no existe");

    return profile;
  }

  static async updateProfile(userId: number, data: { avatar?: string }) {
    return prisma.adminProfile.update({
      where: { userId },
      data,
    });
  }
}