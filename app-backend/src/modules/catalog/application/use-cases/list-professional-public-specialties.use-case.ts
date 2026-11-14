/// ARCHIVO: src/modules/catalog/application/use-cases/list-professional-public-specialties.use-case.ts
import { ActiveAffiliationCheckerPort } from "../ports/active-affiliation-checker.port";
import { ProfessionalPublicSpecialtyQueryPort } from "../ports/professional-public-specialty-query.port";
import { TransactionContext } from "@/shared/types/transaction-context";
import { ProfessionalPublicSpecialtyDTO } from "../dto/professional-public-specialty.dto";

export class ListProfessionalPublicSpecialtiesUseCase {
  constructor(
    private readonly affiliationChecker: ActiveAffiliationCheckerPort,
    private readonly queryPort: ProfessionalPublicSpecialtyQueryPort,
  ) {}

  async execute(
    params: { profileId: number; tenantId: number },
    txContext?: TransactionContext,
  ): Promise<ProfessionalPublicSpecialtyDTO[] | null> {
    const isAffiliated = await this.affiliationChecker.hasActiveAffiliation(
      params.profileId,
      params.tenantId,
    );

    // Si el profesional no mantiene una afiliación activa en el tenant, devuelve null (responderá 404)
    if (!isAffiliated) {
      return null;
    }

    const records = await this.queryPort.findApprovedSpecialtiesByProfessional(
      params.profileId,
      txContext,
    );

    // Proyección pública explícita: garantiza que NUNCA se expongan estados de elegibilidad (PENDING/REJECTED)
    return records.map((record) => ({
      specialtyId: record.specialtyId,
      name: record.specialty.name,
      description: record.specialty.description,
      specialty: {
        id: record.specialty.id,
        name: record.specialty.name,
        description: record.specialty.description,
      },
    }));
  }
}
