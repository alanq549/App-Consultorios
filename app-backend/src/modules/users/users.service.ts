// src/modules/users/users.service.ts
import prisma from "@/shared/database/prisma";
import { Role } from "@prisma/client";
import { ClientProfileService } from "./clientprofile/clientprofile.service";
import { ProfessionalProfileService } from "./professionalprofile/professionalprofile.service";
import { AdminProfileService } from "./adminprofile/adminprofile.service";
import { ConfigService } from "../config/config.service";
import path from "path";
import { UpdateProfileInput } from "./users.types";
import fs from "fs";
// Map de rol -> servicio de perfil
const profileServiceMap: Record<Role, any> = {
  CLIENT: ClientProfileService,
  PROFESSIONAL: ProfessionalProfileService,
  ADMIN: AdminProfileService,
};

export class UsersService {
  static async me(userId: number, role: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("Usuario no existe");

    const config = await ConfigService.getByUser(userId);

    const service = profileServiceMap[role];
    if (!service) throw new Error("Rol no soportado");

    const profile = await service.me(userId);

    return {
      role,
      email: user.email,
      isVerified: user.isVerified,
      profile,
      config,
    };
  }


  // cambio de avatar
  static async updateAvatar(userId: number, role: Role, newAvatar: string) {
    const service = profileServiceMap[role];

    if (!service) throw new Error("Rol no soportado");

    const currentProfile = await service.findByUserId(userId);
    const oldAvatar = currentProfile?.avatar;

    // borrar primero
    if (oldAvatar && oldAvatar !== newAvatar) {
      const fileName = path.basename(oldAvatar);
      const oldPath = path.join(
        process.cwd(),
        "public",
        "img",
        "avatars",
        fileName,
      );
      try {
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
          console.log("Avatar eliminado:", oldPath);
        }
      } catch (err) {
        console.error("Error eliminando avatar:", err);
      }
    }

    await service.updateProfile(userId, {
      avatar: newAvatar,
    });

    return { avatar: newAvatar };
  }

  static async updateProfile(
    userId: number,
    role: Role,
    data: UpdateProfileInput,
  ) {
    const service = profileServiceMap[role];
    if (!service) throw new Error("Rol no soportado");

    return service.updateProfile(userId, data);
  }
}
