/// ARCHIVO: src/modules/profiles/application/use-cases/update-professional-profile.use-case.ts
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { UpdateProfessionalProfileInput } from "../dtos/professional-profile.dto";
import {
  ProfessionalProfileNotFoundError,
  InvalidProfileDataError,
} from "../../domain/profile-errors";

export class UpdateProfessionalProfileUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository
  ) {}

  async execute(
    userId: number,
    input: UpdateProfessionalProfileInput
  ): Promise<{
    id: number;
    name: string;
    lastName: string | null;
    phone: string | null;
    description: string;
  }> {
    // Sanitizar explícitamente el input para permitir solo campos editables por el profesional (D2/Fase 4: name, lastName, phone)
    const sanitizedInput: UpdateProfessionalProfileInput = {};
    if (input.name !== undefined) sanitizedInput.name = input.name;
    if (input.lastName !== undefined) sanitizedInput.lastName = input.lastName;
    if (input.phone !== undefined) sanitizedInput.phone = input.phone;

    const hasValidField = Object.values(sanitizedInput).some(
      (v) => v !== undefined && v !== null
    );
    if (!hasValidField) {
      throw new InvalidProfileDataError("No hay campos para actualizar");
    }

    const existing = await this.professionalProfileRepo.findByUserId(userId);
    if (!existing) {
      throw new ProfessionalProfileNotFoundError(
        "Perfil profesional no existe"
      );
    }

    return this.professionalProfileRepo.updateByUserId(userId, sanitizedInput);
  }
}

