/// ARCHIVO: tests/profiles/profiles-affiliations/submit-affiliation-content.use-case.unit.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  SubmitAffiliationContentUseCase,
  type SubmitAffiliationContentInput,
} from "@/modules/profiles/affiliations/application/use-cases/submit-affiliation-content.use-case";
import {
  AffiliationNotFoundError,
  InvalidAffiliationTransitionError,
  ObsoleteRevisionError,
  ProfessionalProfileNotFoundError,
  UnauthorizedAffiliationActionError,
} from "@/modules/profiles/affiliations/domain/affiliation-errors";
import type { ProfessionalProfileOwnerChecker } from "@/modules/profiles/affiliations/application/ports/professional-profile-owner-checker";
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

describe("SubmitAffiliationContentUseCase", () => {
  let mockProfileOwnerChecker: ProfessionalProfileOwnerChecker;
  let mockAffiliationsRepo: AffiliationRepository;
  let mockRevisionsRepo: AffiliationRevisionRepository;
  let mockAuditRepo: AffiliationAuditRepository;
  let mockUnitOfWork: AffiliationUnitOfWork;
  let useCase: SubmitAffiliationContentUseCase;

  const sampleInput: SubmitAffiliationContentInput = {
    tenantId: 1,
    affiliationId: 100,
    actorUserId: 10,
    content: {
      description: "Nueva descripción profesional actualizada",
      socialLinks: [
        { type: "INSTAGRAM", url: "https://instagram.com/dr_cardiologia" },
      ],
    },
  };

  const sampleActiveAffiliation: AffiliationRecord = {
    id: 100,
    professionalProfileId: 5,
    tenantId: 1,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleCreatedRevision: AffiliationRevisionRecord = {
    id: 202,
    affiliationId: 100,
    revisionNumber: 2,
    status: "PENDING_REVIEW",
    description: "Nueva descripción profesional actualizada",
    submittedByUserId: 10,
    submittedAt: new Date(),
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    socialLinks: [
      { type: "INSTAGRAM", url: "https://instagram.com/dr_cardiologia" },
    ],
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockProfileOwnerChecker = {
      getProfileIdByUserId: vi.fn().mockResolvedValue(5),
    };

    mockAffiliationsRepo = {
      findById: vi.fn().mockResolvedValue(sampleActiveAffiliation),
      findByProfessionalProfileAndTenant: vi.fn(),
      findByTenant: vi.fn().mockResolvedValue([]),
      findByProfessionalProfile: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      lockForRevisionWorkflow: vi.fn().mockResolvedValue(true),
      updateStatusIfCurrent: vi.fn(),
    };

    mockRevisionsRepo = {
      findById: vi.fn(),
      findLatestByAffiliationId: vi.fn().mockResolvedValue(null),
      findByAffiliationId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(sampleCreatedRevision),
      updateStatusIfCurrent: vi.fn().mockResolvedValue({
        updated: true,
        record: {} as any,
      }),
    };

    mockAuditRepo = {
      append: vi.fn().mockResolvedValue({} as any),
      findByAffiliation: vi.fn().mockResolvedValue([]),
    };

    mockUnitOfWork = {
      execute: vi.fn().mockImplementation((work) =>
        work({
          affiliations: mockAffiliationsRepo,
          revisions: mockRevisionsRepo,
          audit: mockAuditRepo,
          memberships: {} as any,
          tenants: { isActiveTenant: vi.fn().mockResolvedValue(true) },
        }),
      ),
    };

    useCase = new SubmitAffiliationContentUseCase(
      mockProfileOwnerChecker,
      mockUnitOfWork,
    );
  });

  it("crea exitosamente nueva propuesta tomando bloqueo pesimista cuando no había revisión pendiente", async () => {
    const result = await useCase.execute(sampleInput);

    // 1. Bloqueo pesimista invocado sobre la afiliación
    expect(mockAffiliationsRepo.lockForRevisionWorkflow).toHaveBeenCalledWith(1, 100);

    // 2. Creó nueva revisión con revisionNumber: 1
    expect(mockRevisionsRepo.create).toHaveBeenCalledWith({
      tenantId: 1,
      affiliationId: 100,
      revisionNumber: 1,
      description: "Nueva descripción profesional actualizada",
      submittedByUserId: 10,
      socialLinks: [
        { type: "INSTAGRAM", url: "https://instagram.com/dr_cardiologia" },
      ],
    });

    // 3. Auditoría de SUBMIT_CONTENT registrada
    expect(mockAuditRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 1,
        affiliationId: 100,
        revisionId: 202,
        action: "SUBMIT_CONTENT",
        actorUserId: 10,
      }),
    );

    expect(result.supersededPreviousRevision).toBe(false);
  });

  it("reemplaza a SUPERSEDED la propuesta anterior si estaba en PENDING_REVIEW", async () => {
    const previousPendingRevision: AffiliationRevisionRecord = {
      id: 201,
      affiliationId: 100,
      revisionNumber: 1,
      status: "PENDING_REVIEW",
      description: "Versión vieja",
      submittedByUserId: 10,
      submittedAt: new Date(),
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      socialLinks: [],
      createdAt: new Date(),
    };

    vi.mocked(mockRevisionsRepo.findLatestByAffiliationId).mockResolvedValueOnce(
      previousPendingRevision,
    );

    const result = await useCase.execute(sampleInput);

    // 1. Bloqueo pesimista invocado primero
    expect(mockAffiliationsRepo.lockForRevisionWorkflow).toHaveBeenCalledWith(1, 100);

    // 2. Actualizó la revisión anterior a SUPERSEDED
    expect(mockRevisionsRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
      1,
      201,
      "PENDING_REVIEW",
      "SUPERSEDED",
    );

    // 3. Registró auditoría SUPERSEDE_CONTENT
    expect(mockAuditRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUPERSEDE_CONTENT",
        revisionId: 201,
      }),
    );

    // 4. Creó la nueva versión con número correlativo N+1
    expect(mockRevisionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        revisionNumber: 2,
      }),
    );

    expect(result.supersededPreviousRevision).toBe(true);
  });

  it("lanza ObsoleteRevisionError y aborta si el CAS falla al intentar reemplazar la propuesta anterior", async () => {
    const previousPendingRevision: AffiliationRevisionRecord = {
      id: 201,
      affiliationId: 100,
      revisionNumber: 1,
      status: "PENDING_REVIEW",
      description: "Versión vieja",
      submittedByUserId: 10,
      submittedAt: new Date(),
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      socialLinks: [],
      createdAt: new Date(),
    };

    vi.mocked(mockRevisionsRepo.findLatestByAffiliationId).mockResolvedValueOnce(
      previousPendingRevision,
    );

    // Simulamos fallo del CAS (p.ej. otra transacción cambió el estado concurrentemente)
    vi.mocked(mockRevisionsRepo.updateStatusIfCurrent).mockResolvedValueOnce({
      updated: false,
      record: null,
    });

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      ObsoleteRevisionError,
    );

    // Asegura que no intentó crear la nueva revisión ni registrar auditoría tras el fallo del CAS
    expect(mockRevisionsRepo.create).not.toHaveBeenCalled();
    expect(mockAuditRepo.append).not.toHaveBeenCalled();
  });

  it("lanza ProfessionalProfileNotFoundError si el usuario no tiene perfil", async () => {
    vi.mocked(mockProfileOwnerChecker.getProfileIdByUserId).mockResolvedValueOnce(
      null,
    );

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      ProfessionalProfileNotFoundError,
    );

    expect(mockUnitOfWork.execute).not.toHaveBeenCalled();
  });

  it("lanza AffiliationNotFoundError si el bloqueo falla por no existir la afiliación en el tenant", async () => {
    vi.mocked(mockAffiliationsRepo.lockForRevisionWorkflow).mockResolvedValueOnce(
      false,
    );

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      AffiliationNotFoundError,
    );
  });

  it("lanza UnauthorizedAffiliationActionError si el actor no es dueño de la afiliación", async () => {
    // Afiliación pertenece a otro perfil profesional
    vi.mocked(mockAffiliationsRepo.findById).mockResolvedValueOnce({
      ...sampleActiveAffiliation,
      professionalProfileId: 999,
    });

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      UnauthorizedAffiliationActionError,
    );
  });

  it("lanza InvalidAffiliationTransitionError si la afiliación no se encuentra en estado ACTIVE", async () => {
    vi.mocked(mockAffiliationsRepo.findById).mockResolvedValueOnce({
      ...sampleActiveAffiliation,
      status: "SUSPENDED",
    });

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      InvalidAffiliationTransitionError,
    );
  });
});
