/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/list-tenant-affiliations.use-case.ts
/// Caso de uso: Listar las afiliaciones de un tenant por parte de un OWNER activo.

import type { AffiliationStatus } from "../../domain/affiliation-types";
import {
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import type { ActiveMembershipChecker } from "../ports/active-membership-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationRevisionRecord } from "../ports/affiliation-revision-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface ListTenantAffiliationsInput {
  tenantId: number;
  actorUserId: number;
  status?: AffiliationStatus;
}

export interface TenantAffiliationListItem {
  affiliation: AffiliationRecord;
  latestRevision: AffiliationRevisionRecord | null;
}

export interface ListTenantAffiliationsOutput {
  items: TenantAffiliationListItem[];
}

export class ListTenantAffiliationsUseCase {
  constructor(
    private readonly membershipChecker: ActiveMembershipChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  async execute(
    input: ListTenantAffiliationsInput,
  ): Promise<ListTenantAffiliationsOutput> {
    const membership = await this.membershipChecker.getActiveMembership(
      input.actorUserId,
      input.tenantId,
    );

    if (!membership || membership.role !== "OWNER") {
      throw new UnauthorizedAffiliationActionError("LIST_AFFILIATIONS");
    }

    return await this.unitOfWork.execute(async (repos) => {
      const isTenantActive = await repos.tenants.isActiveTenant(input.tenantId);
      if (!isTenantActive) {
        throw new TenantNotActiveError(input.tenantId);
      }

      const affiliations = await repos.affiliations.findByTenant(
        input.tenantId,
        input.status ? { status: input.status } : undefined,
      );

      const items: TenantAffiliationListItem[] = [];

      for (const aff of affiliations) {
        const latestRevision =
          await repos.revisions.findLatestByAffiliationId(
            input.tenantId,
            aff.id,
          );
        items.push({
          affiliation: aff,
          latestRevision,
        });
      }

      return { items };
    });
  }
}
