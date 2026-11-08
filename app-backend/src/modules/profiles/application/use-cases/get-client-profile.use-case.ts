/// ARCHIVO: src/modules/profiles/application/use-cases/get-client-profile.use-case.ts
import { ClientProfileRepository } from "../ports/client-profile-repository.port";
import { ClientProfileDTO } from "../dtos/client-profile.dto";
import { ClientProfileNotFoundError } from "../../domain/profile-errors";

export class GetClientProfileUseCase {
  constructor(private readonly clientProfileRepo: ClientProfileRepository) {}

  async execute(userId: number): Promise<ClientProfileDTO> {
    const profile = await this.clientProfileRepo.findByUserId(userId);
    if (!profile) {
      throw new ClientProfileNotFoundError("Perfil de cliente no existe");
    }
    return profile;
  }
}

