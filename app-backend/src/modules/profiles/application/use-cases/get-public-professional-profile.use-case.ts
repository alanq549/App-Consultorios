/// ARCHIVO: src/modules/profiles/application/use-cases/get-public-professional-profile.use-case.ts
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { PublicProfessionalProfileDTO } from "../dtos/professional-profile.dto";

export class GetPublicProfessionalProfileUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository
  ) {}

  async execute(
    profileId: number,
    tenantId: number
  ): Promise<PublicProfessionalProfileDTO | null> {
    return this.professionalProfileRepo.getPublicById(profileId, tenantId);
  }
}

