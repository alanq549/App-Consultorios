/// ARCHIVO: tests/profiles/profiles-affiliations/withdraw-and-reopen.use-case.unit.test.ts
/// Pruebas unitarias para WithdrawAffiliationUseCase y ReopenAffiliationUseCase.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { WithdrawAffiliationUseCase } from "@/modules/profiles/affiliations/application/use-cases/withdraw-affiliation.use-case";
import { ReopenAffiliationUseCase } from "@/modules/profiles/affiliations/application/use-cases/reopen-affiliation.use-case";
import {
  AffiliationNotFoundError,
  ProfessionalProfileNotFoundError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
  InvalidAffiliationTransitionError,
} from "@/modules/profiles/affiliations/domain/affiliation-errors";
import type { AffiliationRecord } from "@/modules/profiles/affiliations/application/ports/affiliation-repository";
import type { AffiliationRevisionRecord } from "@/modules/profiles/affiliations/application/ports/affiliation-revision-repository";

describe("WithdrawAffiliationUseCase & ReopenAffiliationUseCase", () => {
  let mockProfileOwnerChecker: any;
  let mockAffiliationsRepo: any;
  let mockRevisionsRepo: any;
  let mockAuditRepo: any;
  let mockTenantsChecker: any;
  let mockUnitOfWork: any;

  let withdrawUseCase: WithdrawAffiliationUseCase;
  let reopenUseCase: ReopenAffiliationUseCase;

  const sampleAffiliation: AffiliationRecord = {
    id: 10,
    professionalProfileId: 5,
    tenantId: 1,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleRevision: AffiliationRevisionRecord = {
    id: 20,
    affiliationId: 10,
    revisionNumber: 1,
    status: "APPROVED",
    description: "Bio",
    submittedByUserId: 100,
    submittedAt: new Date(),
    reviewedByUserId: 200,
    reviewedAt: new Date(),
    rejectionReason: null,
    createdAt: new Date(),
    socialLinks: [],
  };

  beforeEach(() => {
    mockProfileOwnerChecker = {
      getProfileIdByUserId: vi.fn().mockResolvedValue(5),
    };

    mockAffiliationsRepo = {
      findById: vi.fn().mockResolvedValue(sampleAffiliation),
      findByProfessionalProfileAndTenant: vi.fn(),
      findByTenant: vi.fn(),
      findByProfessionalProfile: vi.fn(),
      create: vi.fn(),
      lockForRevisionWorkflow: vi.fn().mockResolvedValue(true),
      updateStatusIfCurrent: vi.fn().mockImplementation((_, __, ___, nextStatus) =>
        Promise.resolve({
          updated: true,
          record: { ...sampleAffiliation, status: nextStatus },
        }),
      ),
    };

    mockRevisionsRepo = {
      findById: vi.fn(),
      findLatestByAffiliationId: vi.fn().mockResolvedValue(sampleRevision),
      findByAffiliationId: vi.fn().mockResolvedValue([sampleRevision]),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...sampleRevision,
          id: 21,
          revisionNumber: data.revisionNumber,
          description: data.description,
          status: "PENDING_REVIEW",
        }),
      ),
      updateStatusIfCurrent: vi.fn(),
    };

    mockAuditRepo = {
      append: vi.fn().mockResolvedValue({} as any),
      findByAffiliation: vi.fn().mockResolvedValue([]),
    };

    mockTenantsChecker = {
      isActiveTenant: vi.fn().mockResolvedValue(true),
    };

    mockUnitOfWork = {
      execute: vi.fn().mockImplementation((work) =>
        work({
          affiliations: mockAffiliationsRepo,
          revisions: mockRevisionsRepo,
          audit: mockAuditRepo,
          memberships: {} as any,
          tenants: mockTenantsChecker,
        }),
      ),
    };

    withdrawUseCase = new WithdrawAffiliationUseCase(
      mockProfileOwnerChecker,
      mockUnitOfWork,
    );
    reopenUseCase = new ReopenAffiliationUseCase(
      mockProfileOwnerChecker,
      mockUnitOfWork,
    );
  });

  describe("WithdrawAffiliationUseCase", () => {
    it("permite al profesional retirarse exitosamente", async () => {
      const result = await withdrawUseCase.execute({
        tenantId: 1,
        affiliationId: 10,
        actorUserId: 100,
        reason: "Me retiro voluntariamente",
      });

      expect(result.affiliation.status).toBe("WITHDRAWN");
      expect(mockAffiliationsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        10,
        "ACTIVE",
        "WITHDRAWN",
      );
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "WITHDRAW",
          nextStatus: "WITHDRAWN",
          actorUserId: 100,
        }),
      );
    });

    it("lanza TenantNotActiveError si el tenant está inactivo", async () => {
      mockTenantsChecker.isActiveTenant.mockResolvedValue(false);

      await expect(
        withdrawUseCase.execute({
          tenantId: 1,
          affiliationId: 10,
          actorUserId: 100,
        }),
      ).rejects.toThrow(TenantNotActiveError);
    });

    it("lanza UnauthorizedAffiliationActionError si el profesional no es dueño", async () => {
      mockAffiliationsRepo.findById.mockResolvedValue({
        ...sampleAffiliation,
        professionalProfileId: 999, // Otro perfil
      });

      await expect(
        withdrawUseCase.execute({
          tenantId: 1,
          affiliationId: 10,
          actorUserId: 100,
        }),
      ).rejects.toThrow(UnauthorizedAffiliationActionError);
    });
  });

  describe("ReopenAffiliationUseCase", () => {
    it("reabre una afiliación en WITHDRAWN o REJECTED a PENDING_REVIEW", async () => {
      mockAffiliationsRepo.findById.mockResolvedValue({
        ...sampleAffiliation,
        status: "WITHDRAWN",
      });

      const result = await reopenUseCase.execute({
        tenantId: 1,
        affiliationId: 10,
        actorUserId: 100,
        content: {
          description: "Nueva bio para reabrir",
          socialLinks: [],
        },
      });

      expect(result.affiliation.status).toBe("PENDING_REVIEW");
      expect(result.revision).toBeDefined();
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "REOPEN",
          nextStatus: "PENDING_REVIEW",
        }),
      );
    });

    it("rechaza reabrir una afiliación que ya está ACTIVE", async () => {
      mockAffiliationsRepo.findById.mockResolvedValue({
        ...sampleAffiliation,
        status: "ACTIVE",
      });

      await expect(
        reopenUseCase.execute({
          tenantId: 1,
          affiliationId: 10,
          actorUserId: 100,
        }),
      ).rejects.toThrow(InvalidAffiliationTransitionError);
    });
  });
});
