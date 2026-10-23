/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/owner-withdraw-affiliation.use-case.ts
/// Caso de uso: Retiro administrativo de una afiliación ejecutado por el OWNER del consultorio (Owner Withdraw).

import {
  AffiliationNotFoundError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import { AffiliationStateMachine } from "../../domain/affiliation-state-machine";
import type { ActiveMembershipChecker } from "../ports/active-membership-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface OwnerWithdrawAffiliationInput {
  tenantId: number;
  affiliationId: number;
  actorUserId: number;
  reason: string;
}

export interface OwnerWithdrawAffiliationOutput {
  affiliation: AffiliationRecord;
}

export class OwnerWithdrawAffiliationUseCase {
  constructor(
    private readonly membershipChecker: ActiveMembershipChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  async execute(
    input: OwnerWithdrawAffiliationInput,
  ): Promise<OwnerWithdrawAffiliationOutput> {
    const preMembership = await this.membershipChecker.getActiveMembership(
      input.actorUserId,
      input.tenantId,
    );

    if (!preMembership || preMembership.role !== "OWNER") {
      throw new UnauthorizedAffiliationActionError("WITHDRAW");
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
        throw new UnauthorizedAffiliationActionError("WITHDRAW");
      }

      // 3. Lock de fila de afiliación
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

      // 5. Validar transición de estado (requiere motivo para OWNER)
      const nextStatus = AffiliationStateMachine.transition(
        affiliation.status,
        "WITHDRAW",
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
          "Conflicto concurrente al retirar la afiliación",
        );
      }

      // 7. Registrar evento de auditoría
      await repos.audit.append({
        tenantId: input.tenantId,
        affiliationId: affiliation.id,
        action: "WITHDRAW",
        actorUserId: input.actorUserId,
        previousStatus: affiliation.status,
        nextStatus,
        reason: input.reason,
        occurredAt: new Date(),
      });

      return { affiliation: updateResult.record };
    });
  }
}
