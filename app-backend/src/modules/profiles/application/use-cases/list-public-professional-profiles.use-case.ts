/// ARCHIVO: src/modules/profiles/application/use-cases/list-public-professional-profiles.use-case.ts
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { PublicProfessionalProfileDTO } from "../dtos/professional-profile.dto";

export class ListPublicProfessionalProfilesUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository
  ) {}

  async execute(tenantId: number): Promise<PublicProfessionalProfileDTO[]> {
    return this.professionalProfileRepo.getAllPublic(tenantId);
  }
}

