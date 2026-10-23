/// ARCHIVO: tests/profiles/profiles-affiliations/owner-admin-operations.use-case.unit.test.ts
/// Pruebas unitarias para SuspendAffiliationUseCase, ReactivateAffiliationUseCase y OwnerWithdrawAffiliationUseCase.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { SuspendAffiliationUseCase } from "@/modules/profiles/affiliations/application/use-cases/suspend-affiliation.use-case";
import { ReactivateAffiliationUseCase } from "@/modules/profiles/affiliations/application/use-cases/reactivate-affiliation.use-case";
import { OwnerWithdrawAffiliationUseCase } from "@/modules/profiles/affiliations/application/use-cases/owner-withdraw-affiliation.use-case";
import {
  ReasonRequiredError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
  InvalidAffiliationTransitionError,
} from "@/modules/profiles/affiliations/domain/affiliation-errors";
import type { AffiliationRecord } from "@/modules/profiles/affiliations/application/ports/affiliation-repository";

describe("Owner Administrative Use Cases (Suspend, Reactivate, OwnerWithdraw)", () => {
  let mockMembershipChecker: any;
  let mockAffiliationsRepo: any;
  let mockRevisionsRepo: any;
  let mockAuditRepo: any;
  let mockTenantsChecker: any;
  let mockUnitOfWork: any;

  let suspendUseCase: SuspendAffiliationUseCase;
  let reactivateUseCase: ReactivateAffiliationUseCase;
  let ownerWithdrawUseCase: OwnerWithdrawAffiliationUseCase;

  const sampleActiveAffiliation: AffiliationRecord = {
    id: 10,
    professionalProfileId: 5,
    tenantId: 1,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockMembershipChecker = {
      getActiveMembership: vi.fn().mockResolvedValue({
        userId: 99,
        tenantId: 1,
        role: "OWNER",
      }),
      lockActiveMembership: vi.fn().mockResolvedValue({
        userId: 99,
        tenantId: 1,
        role: "OWNER",
      }),
    };

    mockAffiliationsRepo = {
      findById: vi.fn().mockResolvedValue(sampleActiveAffiliation),
      findByProfessionalProfileAndTenant: vi.fn(),
      findByTenant: vi.fn(),
      findByProfessionalProfile: vi.fn(),
      create: vi.fn(),
      lockForRevisionWorkflow: vi.fn().mockResolvedValue(true),
      updateStatusIfCurrent: vi.fn().mockImplementation((_, __, ___, nextStatus) =>
        Promise.resolve({
          updated: true,
          record: { ...sampleActiveAffiliation, status: nextStatus },
        }),
      ),
    };

    mockRevisionsRepo = {
      findById: vi.fn(),
      findLatestByAffiliationId: vi.fn().mockResolvedValue({
        id: 1,
        submittedByUserId: 100, // Solicitante distinto del OWNER
      }),
      findByAffiliationId: vi.fn(),
      create: vi.fn(),
      updateStatusIfCurrent: vi.fn(),
    };

    mockAuditRepo = {
      append: vi.fn().mockResolvedValue({} as any),
      findByAffiliation: vi.fn(),
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
          memberships: mockMembershipChecker,
          tenants: mockTenantsChecker,
        }),
      ),
    };

    suspendUseCase = new SuspendAffiliationUseCase(
      mockMembershipChecker,
      mockUnitOfWork,
    );
    reactivateUseCase = new ReactivateAffiliationUseCase(
      mockMembershipChecker,
      mockUnitOfWork,
    );
    ownerWithdrawUseCase = new OwnerWithdrawAffiliationUseCase(
      mockMembershipChecker,
      mockUnitOfWork,
    );
  });

  describe("SuspendAffiliationUseCase", () => {
    it("permite a un OWNER suspender una afiliación activa proporcionando motivo", async () => {
      const result = await suspendUseCase.execute({
        tenantId: 1,
        affiliationId: 10,
        actorUserId: 99,
        reason: "Falta de pago de consultorio",
      });

      expect(result.affiliation.status).toBe("SUSPENDED");
      expect(mockAffiliationsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        10,
        "ACTIVE",
        "SUSPENDED",
      );
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SUSPEND",
          nextStatus: "SUSPENDED",
          reason: "Falta de pago de consultorio",
        }),
      );
    });

    it("rechaza suspender si el motivo está vacío", async () => {
      await expect(
        suspendUseCase.execute({
          tenantId: 1,
          affiliationId: 10,
          actorUserId: 99,
          reason: "   ",
        }),
      ).rejects.toThrow(ReasonRequiredError);
    });

    it("bloquea a usuarios que no son OWNER (ej. MEMBER o sin membresía)", async () => {
      mockMembershipChecker.getActiveMembership.mockResolvedValue({
        userId: 50,
        tenantId: 1,
        role: "MEMBER",
      });

      await expect(
        suspendUseCase.execute({
          tenantId: 1,
          affiliationId: 10,
          actorUserId: 50,
          reason: "Motivo cualquiera",
        }),
      ).rejects.toThrow(UnauthorizedAffiliationActionError);
    });
  });

  describe("ReactivateAffiliationUseCase", () => {
    it("permite a un OWNER reactivar una afiliación suspendida", async () => {
      mockAffiliationsRepo.findById.mockResolvedValue({
        ...sampleActiveAffiliation,
        status: "SUSPENDED",
      });

      const result = await reactivateUseCase.execute({
        tenantId: 1,
        affiliationId: 10,
        actorUserId: 99,
      });

      expect(result.affiliation.status).toBe("ACTIVE");
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "REACTIVATE",
          nextStatus: "ACTIVE",
        }),
      );
    });

    it("falla al intentar reactivar una afiliación que no estaba SUSPENDED", async () => {
      mockAffiliationsRepo.findById.mockResolvedValue({
        ...sampleActiveAffiliation,
        status: "ACTIVE",
      });

      await expect(
        reactivateUseCase.execute({
          tenantId: 1,
          affiliationId: 10,
          actorUserId: 99,
        }),
      ).rejects.toThrow(InvalidAffiliationTransitionError);
    });
  });

  describe("OwnerWithdrawAffiliationUseCase", () => {
    it("permite a un OWNER retirar una afiliación con motivo obligatorio", async () => {
      const result = await ownerWithdrawUseCase.execute({
        tenantId: 1,
        affiliationId: 10,
        actorUserId: 99,
        reason: "Cierre de relaciones profesionales",
      });

      expect(result.affiliation.status).toBe("WITHDRAWN");
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "WITHDRAW",
          nextStatus: "WITHDRAWN",
          reason: "Cierre de relaciones profesionales",
        }),
      );
    });

    it("exige motivo obligatorio para retiro administrativo por OWNER", async () => {
      await expect(
        ownerWithdrawUseCase.execute({
          tenantId: 1,
          affiliationId: 10,
          actorUserId: 99,
          reason: "",
        }),
      ).rejects.toThrow(ReasonRequiredError);
    });
  });
});
