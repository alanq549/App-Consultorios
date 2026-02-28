// src/modules/users/users.service.ts
import prisma from "@/core/prisma";
import { Role, SpecialtyStatus } from "@prisma/client";

export class UsersService {
  static async me(userId: number, role: Role) {
    const base = await prisma.user.findUnique({
      where: { id: userId },
      include: { customConfig: true },
    });

    if (!base) throw new Error("Usuario no existe");

    if (!base.customConfig) {
      throw new Error("CustomConfig no inicializada");
    }

    const config = {
      language: base.customConfig.language,
      theme: base.customConfig.theme,
      layout: base.customConfig.layout,
      notificationsEnabled: base.customConfig.notificationsEnabled,
    };

    if (role === Role.CLIENT) {
      const profile = await prisma.clientProfile.findUnique({
        where: { userId },
        include: {
          _count: { select: { appointments: true } },
        },
      });

      return {
        role,
        profile,
        config,
      };
    }

    if (role === Role.PROFESSIONAL) {
      const profile = await prisma.professionalProfile.findUnique({
        where: { userId },
        include: {
          specialties: {
            where: { status: SpecialtyStatus.APPROVED }, // solo specialties aprobadas
            include: { specialty: true },
          },
        },
      });

      if (!profile) throw new Error("Perfil no existe");

      const {
        id,
        name,
        lastName,
        phone,
        avatar,
        description,
        verificationStatus,
        specialties,
      } = profile;

      return {
        role,
        profile: {
          id,
          name,
          lastName,
          phone,
          avatar,
          description,
          verificationStatus,
          specialties: specialties.map((ps) => ({
            id: ps.specialty.id,
            name: ps.specialty.name,
            description: ps.specialty.description,
          })),
        },
        config,
      };
    }

    if (role === Role.ADMIN) {
      const profile = await prisma.adminProfile.findUnique({
        where: { userId },
      });

      return {
        role,
        profile,
        config,
      };
    }
  }
}