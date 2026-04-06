// src/modules/users/adminprofile/adminprofile.service.ts
import prisma from "@/core/prisma";

export class AdminProfileService {
  static async me(userId: number) {
    const profile = await prisma.adminProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new Error("Perfil admin no existe");

    return profile;
  }
}