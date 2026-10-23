/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/get-my-affiliation.use-case.ts
/// Caso de uso: Consultar las afiliaciones propias del profesional autenticado.

import { ProfessionalProfileNotFoundError } from "../../domain/affiliation-errors";
import type { ProfessionalProfileOwnerChecker } from "../ports/professional-profile-owner-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationRevisionRecord } from "../ports/affiliation-revision-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface GetMyAffiliationInput {
  actorUserId: number;
  tenantId?: number;
}

export interface AffiliationWithRevisions {
  affiliation: AffiliationRecord;
  revisions: AffiliationRevisionRecord[];
  latestRevision: AffiliationRevisionRecord | null;
}

export interface GetMyAffiliationOutput {
  affiliations: AffiliationWithRevisions[];
}

export class GetMyAffiliationUseCase {
  constructor(
    private readonly profileOwnerChecker: ProfessionalProfileOwnerChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  async execute(input: GetMyAffiliationInput): Promise<GetMyAffiliationOutput> {
    const professionalProfileId =
      await this.profileOwnerChecker.getProfileIdByUserId(input.actorUserId);

    if (!professionalProfileId) {
      throw new ProfessionalProfileNotFoundError(input.actorUserId);
    }

    return await this.unitOfWork.execute(async (repos) => {
      let affiliationRecords: AffiliationRecord[] = [];

      if (input.tenantId !== undefined) {
        const single =
          await repos.affiliations.findByProfessionalProfileAndTenant(
            professionalProfileId,
            input.tenantId,
          );
        if (single) {
          affiliationRecords = [single];
        }
      } else {
        affiliationRecords =
          await repos.affiliations.findByProfessionalProfile(
            professionalProfileId,
          );
      }

      const results: AffiliationWithRevisions[] = [];

      for (const aff of affiliationRecords) {
        const revisions = await repos.revisions.findByAffiliationId(
          aff.tenantId,
          aff.id,
        );
        const latestRevision =
          await repos.revisions.findLatestByAffiliationId(
            aff.tenantId,
            aff.id,
          );

        results.push({
          affiliation: aff,
          revisions,
          latestRevision,
        });
      }

      return { affiliations: results };
    });
  }
}
