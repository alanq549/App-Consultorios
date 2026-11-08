/// ARCHIVO: src/modules/profiles/application/use-cases/get-pending-profiles.use-case.ts
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";

export class GetPendingProfilesUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository
  ) {}

  async execute() {
    return this.professionalProfileRepo.getPendingProfiles();
  }
}

