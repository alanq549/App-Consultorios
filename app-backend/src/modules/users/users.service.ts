// src/modules/users/users.service.ts
import prisma from "@/core/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
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

  ///cambio de correo
  static async changeEmail(
    userId: number,
    currentPassword: string,
    newEmail: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("Usuario no existe");

    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      throw new Error("Contraseña incorrecta");
    }

    const exists = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (exists) {
      throw new Error("El correo ya está en uso");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        isVerified: false,
      },
    });

    return {
      email: updated.email,
      isVerified: updated.isVerified,
    };
  }

  // cambio de password:
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("Usuario no existe");

    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      throw new Error("Contraseña actual incorrecta");
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
      }),

      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
    ]);

    return { message: "Contraseña actualizada" };
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
