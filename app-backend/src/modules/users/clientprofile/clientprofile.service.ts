// src/modules/users/clientprofile/clientprofile.service.ts
import { PrismaClientProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-client-profile-repository";
import { GetClientProfileUseCase } from "@/modules/profiles/application/use-cases/get-client-profile.use-case";
import { UpdateClientProfileUseCase } from "@/modules/profiles/application/use-cases/update-client-profile.use-case";
import { UpdateClientProfileDTO } from "./clientprofile.dto";

const clientProfileRepo = new PrismaClientProfileRepository();
const getClientProfileUseCase = new GetClientProfileUseCase(clientProfileRepo);
const updateClientProfileUseCase = new UpdateClientProfileUseCase(clientProfileRepo);

export class ClientProfileService {
  static async findByUserId(userId: number) {
    return clientProfileRepo.findByUserId(userId);
  }

  // obtener el perfil del cliente
  static async me(userId: number) {
    return getClientProfileUseCase.execute(userId);
  }

  // actualizar el perfil del cliente
  static async updateProfile(userId: number, data: UpdateClientProfileDTO) {
    return updateClientProfileUseCase.execute(userId, data);
  }
}
