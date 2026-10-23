/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/get-tenant-affiliation.use-case.ts
/// Caso de uso: Consultar el detalle completo de una afiliación por parte del OWNER de un tenant.

import {
  AffiliationNotFoundError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import type { ActiveMembershipChecker } from "../ports/active-membership-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationRevisionRecord } from "../ports/affiliation-revision-repository";
import type { AffiliationAuditEventRecord } from "../ports/affiliation-audit-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface GetTenantAffiliationInput {
  tenantId: number;
  affiliationId: number;
  actorUserId: number;
}

export interface GetTenantAffiliationOutput {
  affiliation: AffiliationRecord;
  revisions: AffiliationRevisionRecord[];
  auditTrail: AffiliationAuditEventRecord[];
}

export class GetTenantAffiliationUseCase {
  constructor(
    private readonly membershipChecker: ActiveMembershipChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  async execute(
    input: GetTenantAffiliationInput,
  ): Promise<GetTenantAffiliationOutput> {
    const membership = await this.membershipChecker.getActiveMembership(
      input.actorUserId,
      input.tenantId,
    );

    if (!membership || membership.role !== "OWNER") {
      throw new UnauthorizedAffiliationActionError("GET_AFFILIATION");
    }

    return await this.unitOfWork.execute(async (repos) => {
      const isTenantActive = await repos.tenants.isActiveTenant(input.tenantId);
      if (!isTenantActive) {
        throw new TenantNotActiveError(input.tenantId);
      }

      const affiliation = await repos.affiliations.findById(
        input.tenantId,
        input.affiliationId,
      );

      if (!affiliation) {
        throw new AffiliationNotFoundError(input.affiliationId, input.tenantId);
      }

      const revisions = await repos.revisions.findByAffiliationId(
        input.tenantId,
        input.affiliationId,
      );

      const auditTrail = await repos.audit.findByAffiliation(
        input.tenantId,
        input.affiliationId,
      );

      return {
        affiliation,
        revisions,
        auditTrail,
      };
    });
  }
}
