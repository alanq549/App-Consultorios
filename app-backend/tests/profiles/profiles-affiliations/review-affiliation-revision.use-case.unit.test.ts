/// ARCHIVO: tests/profiles/profiles-affiliations/review-affiliation-revision.use-case.unit.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ReviewAffiliationRevisionUseCase,
  type ReviewAffiliationRevisionInput,
} from "@/modules/profiles/affiliations/application/use-cases/review-affiliation-revision.use-case";
import {
  AffiliationNotFoundError,
  ObsoleteRevisionError,
  ReasonRequiredError,
  SelfReviewForbiddenError,
  UnauthorizedAffiliationActionError,
} from "@/modules/profiles/affiliations/domain/affiliation-errors";
import type { ActiveMembershipChecker } from "@/modules/profiles/affiliations/application/ports/active-membership-checker";
import type { AffiliationUnitOfWork } from "@/modules/profiles/affiliations/application/ports/affiliation-unit-of-work";
import type {
  AffiliationRecord,
  AffiliationRepository,
} from "@/modules/profiles/affiliations/application/ports/affiliation-repository";
import type {
  AffiliationRevisionRecord,
  AffiliationRevisionRepository,
} from "@/modules/profiles/affiliations/application/ports/affiliation-revision-repository";
import type { AffiliationAuditRepository } from "@/modules/profiles/affiliations/application/ports/affiliation-audit-repository";

describe("ReviewAffiliationRevisionUseCase", () => {
  let mockMembershipChecker: ActiveMembershipChecker;
  let mockAffiliationsRepo: AffiliationRepository;
  let mockRevisionsRepo: AffiliationRevisionRepository;
  let mockAuditRepo: AffiliationAuditRepository;
  let mockUnitOfWork: AffiliationUnitOfWork;
  let useCase: ReviewAffiliationRevisionUseCase;

  const sampleApproveInput: ReviewAffiliationRevisionInput = {
    tenantId: 1,
    affiliationId: 100,
    revisionId: 201,
    reviewerUserId: 20, // Revisor (OWNER)
    decision: "APPROVE",
  };

  const sampleRejectInput: ReviewAffiliationRevisionInput = {
    tenantId: 1,
    affiliationId: 100,
    revisionId: 201,
    reviewerUserId: 20,
    decision: "REJECT",
    reason: "Enlaces de redes sociales inválidos",
  };

  const samplePendingAffiliation: AffiliationRecord = {
    id: 100,
    professionalProfileId: 5,
    tenantId: 1,
    status: "PENDING_REVIEW",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleActiveAffiliation: AffiliationRecord = {
    id: 100,
    professionalProfileId: 5,
    tenantId: 1,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const samplePendingRevision: AffiliationRevisionRecord = {
    id: 201,
    affiliationId: 100,
    revisionNumber: 1,
    status: "PENDING_REVIEW",
    description: "Perfil profesional en espera de aprobación",
    submittedByUserId: 10, // Profesional solicitante (distinto del revisor 20)
    submittedAt: new Date(),
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    socialLinks: [],
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockMembershipChecker = {
      getActiveMembership: vi.fn().mockResolvedValue({
        userId: 20,
        tenantId: 1,
        role: "OWNER",
      }),
      lockActiveMembership: vi.fn().mockResolvedValue({
        userId: 20,
        tenantId: 1,
        role: "OWNER",
      }),
    };

    mockAffiliationsRepo = {
      findById: vi.fn().mockResolvedValue(samplePendingAffiliation),
      findByProfessionalProfileAndTenant: vi.fn(),
      findByTenant: vi.fn().mockResolvedValue([]),
      findByProfessionalProfile: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      lockForRevisionWorkflow: vi.fn().mockResolvedValue(true),
      updateStatusIfCurrent: vi.fn().mockImplementation((_, __, ___, nextStatus) =>
        Promise.resolve({
          updated: true,
          record: { ...samplePendingAffiliation, status: nextStatus },
        }),
      ),
    };

    mockRevisionsRepo = {
      findById: vi.fn().mockResolvedValue(samplePendingRevision),
      findLatestByAffiliationId: vi.fn().mockResolvedValue(samplePendingRevision),
      findByAffiliationId: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      updateStatusIfCurrent: vi.fn().mockImplementation((_, __, ___, nextStatus) =>
        Promise.resolve({
          updated: true,
          record: { ...samplePendingRevision, status: nextStatus },
        }),
      ),
    };

    mockAuditRepo = {
      append: vi.fn().mockResolvedValue({} as any),
      findByAffiliation: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
    };

    mockUnitOfWork = {
      execute: vi.fn().mockImplementation((work) =>
        work({
          affiliations: mockAffiliationsRepo,
          revisions: mockRevisionsRepo,
          audit: mockAuditRepo,
          memberships: mockMembershipChecker,
          tenants: { isActiveTenant: vi.fn().mockResolvedValue(true) },
        }),
      ),
    };

    useCase = new ReviewAffiliationRevisionUseCase(
      mockMembershipChecker,
      mockUnitOfWork,
    );
  });

  describe("Afiliación en estado PENDING_REVIEW (primera postulación)", () => {
    it("aprueba exitosamente la afiliación inicial y su revisión inicial tomando bloqueo", async () => {
      const result = await useCase.execute(sampleApproveInput);

      // Bloqueo pesimista tomado
      expect(mockAffiliationsRepo.lockForRevisionWorkflow).toHaveBeenCalledWith(1, 100);

      // Afiliación pasa a ACTIVE
      expect(mockAffiliationsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        100,
        "PENDING_REVIEW",
        "ACTIVE",
      );

      // Revisión pasa a APPROVED
      expect(mockRevisionsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        201,
        "PENDING_REVIEW",
        "APPROVED",
        expect.objectContaining({ reviewedByUserId: 20 }),
      );

      // Auditorías registradas
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: "APPROVE_AFFILIATION", nextStatus: "ACTIVE" }),
      );
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: "APPROVE_CONTENT" }),
      );

      expect(result.affiliation.status).toBe("ACTIVE");
      expect(result.revision.status).toBe("APPROVED");
    });

    it("rechaza exitosamente la afiliación inicial con motivo", async () => {
      const result = await useCase.execute(sampleRejectInput);

      // Bloqueo tomado
      expect(mockAffiliationsRepo.lockForRevisionWorkflow).toHaveBeenCalledWith(1, 100);

      // Afiliación pasa a REJECTED
      expect(mockAffiliationsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        100,
        "PENDING_REVIEW",
        "REJECTED",
      );

      // Revisión pasa a REJECTED
      expect(mockRevisionsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        201,
        "PENDING_REVIEW",
        "REJECTED",
        expect.objectContaining({
          reviewedByUserId: 20,
          rejectionReason: "Enlaces de redes sociales inválidos",
        }),
      );

      expect(result.affiliation.status).toBe("REJECTED");
      expect(result.revision.status).toBe("REJECTED");
    });
  });

  describe("Afiliación ya en estado ACTIVE (evaluación de actualización de contenido)", () => {
    beforeEach(() => {
      vi.mocked(mockAffiliationsRepo.findById).mockResolvedValue(sampleActiveAffiliation);
    });

    it("aprueba únicamente la revisión de contenido manteniendo la afiliación ACTIVE", async () => {
      const result = await useCase.execute(sampleApproveInput);

      // Bloqueo tomado
      expect(mockAffiliationsRepo.lockForRevisionWorkflow).toHaveBeenCalledWith(1, 100);

      // La afiliación NO se actualiza (ya está ACTIVE)
      expect(mockAffiliationsRepo.updateStatusIfCurrent).not.toHaveBeenCalled();

      // La revisión sí pasa a APPROVED
      expect(mockRevisionsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        201,
        "PENDING_REVIEW",
        "APPROVED",
        expect.objectContaining({ reviewedByUserId: 20 }),
      );

      // Auditoría es únicamente APPROVE_CONTENT
      expect(mockAuditRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: "APPROVE_CONTENT" }),
      );
      expect(result.affiliation.status).toBe("ACTIVE");
      expect(result.revision.status).toBe("APPROVED");
    });

    it("rechaza únicamente la propuesta de contenido y conserva la afiliación en ACTIVE", async () => {
      const result = await useCase.execute(sampleRejectInput);

      // La afiliación NO cambia de estado
      expect(mockAffiliationsRepo.updateStatusIfCurrent).not.toHaveBeenCalled();

      // La revisión pasa a REJECTED
      expect(mockRevisionsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        1,
        201,
        "PENDING_REVIEW",
        "REJECTED",
        expect.objectContaining({ rejectionReason: "Enlaces de redes sociales inválidos" }),
      );

      expect(result.affiliation.status).toBe("ACTIVE");
      expect(result.revision.status).toBe("REJECTED");
    });
  });

  describe("Protección de concurrencia y reglas de negocio", () => {
    it("lanza ObsoleteRevisionError si la revisión solicitada no es la más reciente (carrera con nueva propuesta)", async () => {
      // Supongamos que mientras el revisor miraba la revisión 201, el médico envió la revisión 202
      const newerRevision: AffiliationRevisionRecord = {
        ...samplePendingRevision,
        id: 202,
        revisionNumber: 2,
      };

      vi.mocked(mockRevisionsRepo.findLatestByAffiliationId).mockResolvedValueOnce(newerRevision);

      // El revisor intenta aprobar la revisión vieja 201
      await expect(useCase.execute(sampleApproveInput)).rejects.toThrow(
        ObsoleteRevisionError,
      );

      // No se ejecutan escrituras
      expect(mockRevisionsRepo.updateStatusIfCurrent).not.toHaveBeenCalled();
      expect(mockAuditRepo.append).not.toHaveBeenCalled();
    });

    it("lanza ObsoleteRevisionError si la revisión más reciente ya no está en PENDING_REVIEW", async () => {
      vi.mocked(mockRevisionsRepo.findLatestByAffiliationId).mockResolvedValueOnce({
        ...samplePendingRevision,
        status: "APPROVED",
      });

      await expect(useCase.execute(sampleApproveInput)).rejects.toThrow(
        ObsoleteRevisionError,
      );
    });

    it("lanza SelfReviewForbiddenError si el revisor es el mismo autor de la propuesta", async () => {
      // El revisor 10 intenta evaluarse a sí mismo
      const selfInput: ReviewAffiliationRevisionInput = {
        ...sampleApproveInput,
        reviewerUserId: 10,
      };

      vi.mocked(mockMembershipChecker.getActiveMembership).mockResolvedValueOnce({
        userId: 10,
        tenantId: 1,
        role: "OWNER",
      });

      await expect(useCase.execute(selfInput)).rejects.toThrow(
        SelfReviewForbiddenError,
      );
    });

    it("lanza UnauthorizedAffiliationActionError si el usuario no tiene rol OWNER en el tenant", async () => {
      vi.mocked(mockMembershipChecker.getActiveMembership).mockResolvedValueOnce({
        userId: 20,
        tenantId: 1,
        role: "MEMBER",
      });

      await expect(useCase.execute(sampleApproveInput)).rejects.toThrow(
        UnauthorizedAffiliationActionError,
      );

      expect(mockUnitOfWork.execute).not.toHaveBeenCalled();
    });

    it("lanza ReasonRequiredError si se intenta rechazar sin motivo", async () => {
      const inputWithoutReason: ReviewAffiliationRevisionInput = {
        ...sampleRejectInput,
        reason: "   ",
      };

      await expect(useCase.execute(inputWithoutReason)).rejects.toThrow(
        ReasonRequiredError,
      );
    });

    it("lanza AffiliationNotFoundError si el bloqueo pesimista falla por no existir la afiliación", async () => {
      vi.mocked(mockAffiliationsRepo.lockForRevisionWorkflow).mockResolvedValueOnce(false);

      await expect(useCase.execute(sampleApproveInput)).rejects.toThrow(
        AffiliationNotFoundError,
      );
    });
  });
});
