/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/reopen-affiliation.use-case.ts
/// Caso de uso: Reabrir una postulación rechazada o retirada (Reopen).

import type { AffiliationContent } from "../../domain/affiliation-types";
import {
  AffiliationNotFoundError,
  DuplicateSocialLinkTypeError,
  ProfessionalProfileNotFoundError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import { AffiliationStateMachine } from "../../domain/affiliation-state-machine";
import type { ProfessionalProfileOwnerChecker } from "../ports/professional-profile-owner-checker";
import type { AffiliationRecord } from "../ports/affiliation-repository";
import type { AffiliationRevisionRecord } from "../ports/affiliation-revision-repository";
import type { AffiliationUnitOfWork } from "../ports/affiliation-unit-of-work";

export interface ReopenAffiliationInput {
  tenantId: number;
  affiliationId: number;
  actorUserId: number;
  content?: AffiliationContent;
  reason?: string;
}

export interface ReopenAffiliationOutput {
  affiliation: AffiliationRecord;
  revision?: AffiliationRevisionRecord;
}

export class ReopenAffiliationUseCase {
  constructor(
    private readonly profileOwnerChecker: ProfessionalProfileOwnerChecker,
    private readonly unitOfWork: AffiliationUnitOfWork,
  ) {}

  async execute(
    input: ReopenAffiliationInput,
  ): Promise<ReopenAffiliationOutput> {
    const professionalProfileId =
      await this.profileOwnerChecker.getProfileIdByUserId(input.actorUserId);

    if (!professionalProfileId) {
      throw new ProfessionalProfileNotFoundError(input.actorUserId);
    }

    if (input.content?.socialLinks && input.content.socialLinks.length > 0) {
      const seenTypes = new Set<string>();
      for (const link of input.content.socialLinks) {
        if (seenTypes.has(link.type)) {
          throw new DuplicateSocialLinkTypeError(link.type);
        }
        seenTypes.add(link.type);
      }
    }

    return await this.unitOfWork.execute(async (repos) => {
      // 1. Validar tenant activo
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
        throw new UnauthorizedAffiliationActionError("REOPEN");
      }

      // 4. Validar transición de estado
      const nextStatus = AffiliationStateMachine.transition(
        affiliation.status,
        "REOPEN",
        {
          actor: {
            authority: "SELF",
            userId: input.actorUserId,
          },
          applicantUserId: input.actorUserId,
          reason: input.reason,
        },
      );

      // 5. Actualizar estado de afiliación
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

      let newRevision: AffiliationRevisionRecord | undefined;

      // 6. Si se incluye nuevo contenido, crear una nueva revisión versionada
      if (input.content) {
        const latest = await repos.revisions.findLatestByAffiliationId(
          input.tenantId,
          affiliation.id,
        );
        const nextRevisionNumber = (latest?.revisionNumber ?? 0) + 1;

        newRevision = await repos.revisions.create({
          tenantId: input.tenantId,
          affiliationId: affiliation.id,
          revisionNumber: nextRevisionNumber,
          description: input.content.description,
          submittedByUserId: input.actorUserId,
          socialLinks: input.content.socialLinks,
        });
      }

      // 7. Registrar evento de auditoría
      await repos.audit.append({
        tenantId: input.tenantId,
        affiliationId: affiliation.id,
        revisionId: newRevision?.id ?? null,
        action: "REOPEN",
        actorUserId: input.actorUserId,
        previousStatus: affiliation.status,
        nextStatus,
        reason: input.reason ?? null,
        occurredAt: new Date(),
      });

      return {
        affiliation: updateResult.record,
        revision: newRevision,
      };
    });
  }
}
