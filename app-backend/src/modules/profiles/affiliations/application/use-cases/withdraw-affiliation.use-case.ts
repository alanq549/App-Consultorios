/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/withdraw-affiliation.use-case.ts
/// Caso de uso: Retiro voluntario del profesional de una afiliación (Withdraw).

import {
  AffiliationNotFoundError,
  ProfessionalProfileNotFoundError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import { AffiliationStateMachine } from "../../domain/affiliation-state-machine";
import type { ProfessionalProfileOwnerChecker } from "../ports/professional-profile-owner-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface WithdrawAffiliationInput {
  tenantId: number;
  affiliationId: number;
  actorUserId: number;
  reason?: string;
}

export interface WithdrawAffiliationOutput {
  affiliation: AffiliationRecord;
}

export class WithdrawAffiliationUseCase {
  constructor(
    private readonly profileOwnerChecker: ProfessionalProfileOwnerChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  async execute(
    input: WithdrawAffiliationInput,
  ): Promise<WithdrawAffiliationOutput> {
    const professionalProfileId =
      await this.profileOwnerChecker.getProfileIdByUserId(input.actorUserId);

    if (!professionalProfileId) {
      throw new ProfessionalProfileNotFoundError(input.actorUserId);
    }

    return await this.unitOfWork.execute(async (repos) => {
      // 1. Validar que el tenant esté activo
      const isTenantActive = await repos.tenants.isActiveTenant(input.tenantId);
      if (!isTenantActive) {
        throw new TenantNotActiveError(input.tenantId);
      }

      // 2. Bloqueo de fila
      const locked = await repos.affiliations.lockForRevisionWorkflow(
        input.tenantId,
        input.affiliationId,
      );
      if (!locked) {
        throw new AffiliationNotFoundError(input.affiliationId, input.tenantId);
      }

      // 3. Obtener afiliación y comprobar titularidad
      const affiliation = await repos.affiliations.findById(
        input.tenantId,
        input.affiliationId,
      );
      if (!affiliation) {
        throw new AffiliationNotFoundError(input.affiliationId, input.tenantId);
      }

      if (affiliation.professionalProfileId !== professionalProfileId) {
        throw new UnauthorizedAffiliationActionError("WITHDRAW");
      }

      // 4. Validar transición con la máquina de estados
      const nextStatus = AffiliationStateMachine.transition(
        affiliation.status,
        "WITHDRAW",
        {
          actor: {
            authority: "SELF",
            userId: input.actorUserId,
          },
          applicantUserId: input.actorUserId,
          reason: input.reason,
        },
      );

      // 5. Actualizar estado
      const updateResult = await repos.affiliations.updateStatusIfCurrent(
        input.tenantId,
        affiliation.id,
        affiliation.status,
        nextStatus,
      );

      if (!updateResult.updated) {
        throw new Error(
          "Conflicto concurrente al actualizar estado de la afiliación",
        );
      }

      // 6. Registrar evento de auditoría
      await repos.audit.append({
        tenantId: input.tenantId,
        affiliationId: affiliation.id,
        action: "WITHDRAW",
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
