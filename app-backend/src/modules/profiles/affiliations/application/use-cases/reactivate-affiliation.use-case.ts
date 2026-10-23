/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/reactivate-affiliation.use-case.ts
/// Caso de uso: Reactivar una afiliación suspendida por parte del OWNER del consultorio (Reactivate).

import {
  AffiliationNotFoundError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import { AffiliationStateMachine } from "../../domain/affiliation-state-machine";
import type { ActiveMembershipChecker } from "../ports/active-membership-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface ReactivateAffiliationInput {
  tenantId: number;
  affiliationId: number;
  actorUserId: number;
  reason?: string;
}

export interface ReactivateAffiliationOutput {
  affiliation: AffiliationRecord;
}

export class ReactivateAffiliationUseCase {
  constructor(
    private readonly membershipChecker: ActiveMembershipChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  async execute(
    input: ReactivateAffiliationInput,
  ): Promise<ReactivateAffiliationOutput> {
    const preMembership = await this.membershipChecker.getActiveMembership(
      input.actorUserId,
      input.tenantId,
    );

    if (!preMembership || preMembership.role !== "OWNER") {
      throw new UnauthorizedAffiliationActionError("REACTIVATE");
    }

    return await this.unitOfWork.execute(async (repos) => {
      // 1. Validar tenant activo
      const isTenantActive = await repos.tenants.isActiveTenant(input.tenantId);
      if (!isTenantActive) {
        throw new TenantNotActiveError(input.tenantId);
      }

      // 2. Lock de membresía transaccional
      const membership = await repos.memberships.lockActiveMembership(
        input.actorUserId,
        input.tenantId,
      );
      if (!membership || membership.role !== "OWNER") {
        throw new UnauthorizedAffiliationActionError("REACTIVATE");
      }

      // 3. Lock de la fila de afiliación
      const locked = await repos.affiliations.lockForRevisionWorkflow(
        input.tenantId,
        input.affiliationId,
      );
      if (!locked) {
        throw new AffiliationNotFoundError(input.affiliationId, input.tenantId);
      }

      // 4. Obtener afiliación actual
      const affiliation = await repos.affiliations.findById(
        input.tenantId,
        input.affiliationId,
      );
      if (!affiliation) {
        throw new AffiliationNotFoundError(input.affiliationId, input.tenantId);
      }

      const latestRevision = await repos.revisions.findLatestByAffiliationId(
        input.tenantId,
        input.affiliationId,
      );
      const applicantUserId = latestRevision?.submittedByUserId ?? 0;

      // 5. Validar transición de estado
      const nextStatus = AffiliationStateMachine.transition(
        affiliation.status,
        "REACTIVATE",
        {
          applicantUserId,
          actor: {
            authority: "OWNER",
            userId: input.actorUserId,
          },
          reason: input.reason,
        },
      );

      // 6. Actualizar estado
      const updateResult = await repos.affiliations.updateStatusIfCurrent(
        input.tenantId,
        affiliation.id,
        affiliation.status,
        nextStatus,
      );

      if (!updateResult.updated) {
        throw new Error(
          "Conflicto concurrente al reactivar la afiliación",
        );
      }

      // 7. Registrar evento de auditoría
      await repos.audit.append({
        tenantId: input.tenantId,
        affiliationId: affiliation.id,
        action: "REACTIVATE",
        actorUserId: input.actorUserId,
        previousStatus: affiliation.status,
        nextStatus,
        reason: input.reason ?? null,
        occurredAt: new Date(),
      });

      return { affiliation: updateResult.record };
    });
  }
}
