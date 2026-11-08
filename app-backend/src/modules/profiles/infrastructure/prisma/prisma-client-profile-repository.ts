/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-client-profile-repository.ts
import prisma from "@/shared/database/prisma";
import { ClientProfileRepository } from "../../application/ports/client-profile-repository.port";
import {
  ClientProfileDTO,
  UpdateClientProfileInput,
} from "../../application/dtos/client-profile.dto";
import { ClientProfileMapper } from "@/modules/users/clientprofile/clientprofile.mapper";

export class PrismaClientProfileRepository implements ClientProfileRepository {
  async findByUserId(userId: number): Promise<ClientProfileDTO | null> {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        _count: { select: { appointments: true } },
      },
    });

    if (!profile) return null;

    return ClientProfileMapper.toResponse(profile);
  }

  async updateByUserId(
    userId: number,
    data: UpdateClientProfileInput
  ): Promise<ClientProfileDTO> {
    const profile = await prisma.clientProfile.update({
      where: { userId },
      data,
      include: {
        _count: { select: { appointments: true } },
      },
    });

    return ClientProfileMapper.toResponse(profile);
  }

  async updateAvatar(userId: number, avatar: string): Promise<void> {
    await prisma.clientProfile.update({
      where: { userId },
      data: { avatar },
    });
  }
}

