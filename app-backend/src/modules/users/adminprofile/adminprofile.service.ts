// src/modules/users/adminprofile/adminprofile.service.ts
import { PrismaAdminProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-admin-profile-repository";
import { AdminProfileNotFoundError } from "@/modules/profiles/domain/profile-errors";

const adminRepo = new PrismaAdminProfileRepository();

export class AdminProfileService {
  static async findByUserId(userId: number) {
    return adminRepo.findByUserId(userId);
  }

  static async me(userId: number) {
    const profile = await adminRepo.findByUserId(userId);
    if (!profile) {
      throw new AdminProfileNotFoundError("Perfil admin no existe");
    }
    return profile;
  }

  static async updateProfile(userId: number, data: { avatar?: string }) {
    if (data.avatar) {
      await adminRepo.updateAvatar(userId, data.avatar);
    }
    return adminRepo.findByUserId(userId);
  }
}
