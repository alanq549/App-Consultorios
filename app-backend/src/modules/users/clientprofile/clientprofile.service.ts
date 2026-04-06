// src/modules/users/clientprofile/clientprofile.service.ts
import prisma from "@/core/prisma";
import { ClientProfileMapper } from "./clientprofile.mapper";
import { UpdateClientProfileDTO } from "./clientprofile.dto";

export class ClientProfileService {

   static async findByUserId(userId: number) {
    return prisma.clientProfile.findUnique({
      where: { userId },
    });
  }

  // obtener el perfil del cliente
  static async me(userId: number) {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        _count: { select: { appointments: true } },
      },
    });

    if (!profile) throw new Error("Perfil de cliente no existe");

    return ClientProfileMapper.toResponse(profile);
  }

  // actualizar el perfil del cliente 
  static async updateProfile(userId: number, data: UpdateClientProfileDTO) {
    const hasValidField = Object.values(data).some((v) => v !== undefined);
    if (!hasValidField) {
      throw new Error("No hay campos para actualizar");
    }

    const profile = await prisma.clientProfile.update({
      where: { userId },
      data,
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    return ClientProfileMapper.toResponse(profile);
  }
}
