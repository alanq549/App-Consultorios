/// ARCHIVO: src/modules/profiles/application/use-cases/get-all-profiles.use-case.ts
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";

export class GetAllProfilesUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository
  ) {}

  async execute() {
    return this.professionalProfileRepo.getAllProfiles();
  }
}

