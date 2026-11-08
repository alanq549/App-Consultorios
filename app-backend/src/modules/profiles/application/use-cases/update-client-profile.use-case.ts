/// ARCHIVO: src/modules/profiles/application/use-cases/update-client-profile.use-case.ts
import { ClientProfileRepository } from "../ports/client-profile-repository.port";
import { ClientProfileDTO, UpdateClientProfileInput } from "../dtos/client-profile.dto";
import {
  ClientProfileNotFoundError,
  InvalidProfileDataError,
} from "../../domain/profile-errors";

export class UpdateClientProfileUseCase {
  constructor(private readonly clientProfileRepo: ClientProfileRepository) {}

  async execute(
    userId: number,
    input: UpdateClientProfileInput
  ): Promise<ClientProfileDTO> {
    const hasValidField = Object.values(input).some(
      (v) => v !== undefined && v !== null
    );
    if (!hasValidField) {
      throw new InvalidProfileDataError("No hay campos para actualizar");
    }

    const existing = await this.clientProfileRepo.findByUserId(userId);
    if (!existing) {
      throw new ClientProfileNotFoundError("Perfil de cliente no existe");
    }

    return this.clientProfileRepo.updateByUserId(userId, input);
  }
}

