/// ARCHIVO: tests/profiles/profiles-affiliations/request-affiliation.use-case.unit.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  RequestAffiliationUseCase,
  type RequestAffiliationInput,
} from "@/modules/profiles/affiliations/application/use-cases/request-affiliation.use-case";
import {
  AffiliationAlreadyExistsError,
  ProfessionalProfileNotFoundError,
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

describe("RequestAffiliationUseCase", () => {
  let mockProfileOwnerChecker: ProfessionalProfileOwnerChecker;
  let mockAffiliationsRepo: AffiliationRepository;
  let mockRevisionsRepo: AffiliationRevisionRepository;
  let mockAuditRepo: AffiliationAuditRepository;
  let mockUnitOfWork: AffiliationUnitOfWork;
  let useCase: RequestAffiliationUseCase;

  const sampleInput: RequestAffiliationInput = {
    tenantId: 1,
    actorUserId: 10,
    content: {
      description: "Médico cardiólogo con 10 años de experiencia",
      socialLinks: [
        { type: "LINKEDIN", url: "https://linkedin.com/in/doctor" },
      ],
    },
  };

  const sampleAffiliation: AffiliationRecord = {
    id: 100,
    professionalProfileId: 5,
    tenantId: 1,
    status: "PENDING_REVIEW",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleRevision: AffiliationRevisionRecord = {
    id: 200,
    affiliationId: 100,
    revisionNumber: 1,
    status: "PENDING_REVIEW",
    description: "Médico cardiólogo con 10 años de experiencia",
    submittedByUserId: 10,
    submittedAt: new Date(),
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    socialLinks: [
      { type: "LINKEDIN", url: "https://linkedin.com/in/doctor" },
    ],
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockProfileOwnerChecker = {
      getProfileIdByUserId: vi.fn().mockResolvedValue(5),
    };

    mockAffiliationsRepo = {
      findById: vi.fn(),
      findByProfessionalProfileAndTenant: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(sampleAffiliation),
      lockForRevisionWorkflow: vi.fn(),
      updateStatusIfCurrent: vi.fn(),
    };

    mockRevisionsRepo = {
      findById: vi.fn(),
      findLatestByAffiliationId: vi.fn(),
      create: vi.fn().mockResolvedValue(sampleRevision),
      updateStatusIfCurrent: vi.fn(),
    };

    mockAuditRepo = {
      append: vi.fn().mockResolvedValue({
        id: 300,
        tenantId: 1,
        affiliationId: 100,
        revisionId: 200,
        action: "APPLY",
        actorUserId: 10,
        previousStatus: null,
        nextStatus: "PENDING_REVIEW",
        createdAt: new Date(),
      }),
    };

    mockUnitOfWork = {
      execute: vi.fn().mockImplementation((work) =>
        work({
          affiliations: mockAffiliationsRepo,
          revisions: mockRevisionsRepo,
          audit: mockAuditRepo,
          memberships: {} as any,
        }),
      ),
    };

    useCase = new RequestAffiliationUseCase(
      mockProfileOwnerChecker,
      mockUnitOfWork,
    );
  });

  it("crea exitosamente la afiliación, revisión #1 y evento de auditoría APPLY", async () => {
    const result = await useCase.execute(sampleInput);

    // 1. Validó que el perfil profesional pertenece al actor
    expect(mockProfileOwnerChecker.getProfileIdByUserId).toHaveBeenCalledWith(10);

    // 2. Ejecutó dentro de la unidad de trabajo (Unit of Work)
    expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);

    // 3. Comprobó duplicados
    expect(
      mockAffiliationsRepo.findByProfessionalProfileAndTenant,
    ).toHaveBeenCalledWith(5, 1);

    // 4. Creó la afiliación con estado PENDING_REVIEW
    expect(mockAffiliationsRepo.create).toHaveBeenCalledWith({
      professionalProfileId: 5,
      tenantId: 1,
      status: "PENDING_REVIEW",
    });

    // 5. Creó la revisión #1 en PENDING_REVIEW con sus redes sociales
    expect(mockRevisionsRepo.create).toHaveBeenCalledWith({
      tenantId: 1,
      affiliationId: 100,
      revisionNumber: 1,
      description: "Médico cardiólogo con 10 años de experiencia",
      submittedByUserId: 10,
      socialLinks: [
        { type: "LINKEDIN", url: "https://linkedin.com/in/doctor" },
      ],
    });

    // 6. Registró auditoría APPLY con previousStatus: null
    expect(mockAuditRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 1,
        affiliationId: 100,
        revisionId: 200,
        action: "APPLY",
        actorUserId: 10,
        previousStatus: null,
        nextStatus: "PENDING_REVIEW",
      }),
    );

    // 7. Retornó los registros creados
    expect(result).toEqual({
      affiliation: sampleAffiliation,
      revision: sampleRevision,
    });
  });

  it("lanza ProfessionalProfileNotFoundError si el usuario no tiene perfil profesional y no ejecuta la UoW", async () => {
    vi.mocked(mockProfileOwnerChecker.getProfileIdByUserId).mockResolvedValueOnce(
      null,
    );

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      ProfessionalProfileNotFoundError,
    );

    expect(mockUnitOfWork.execute).not.toHaveBeenCalled();
    expect(mockAffiliationsRepo.create).not.toHaveBeenCalled();
  });

  it("lanza AffiliationAlreadyExistsError si ya existe una afiliación previa para el perfil y tenant", async () => {
    vi.mocked(
      mockAffiliationsRepo.findByProfessionalProfileAndTenant,
    ).mockResolvedValueOnce(sampleAffiliation);

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      AffiliationAlreadyExistsError,
    );

    expect(mockAffiliationsRepo.create).not.toHaveBeenCalled();
    expect(mockRevisionsRepo.create).not.toHaveBeenCalled();
    expect(mockAuditRepo.append).not.toHaveBeenCalled();
  });

  it("captura colisión concurrente P2002 de Prisma y lanza AffiliationAlreadyExistsError", async () => {
    const prismaUniqueError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (professionalProfileId, tenantId)",
      {
        code: "P2002",
        clientVersion: "5.0.0",
      },
    );

    vi.mocked(mockAffiliationsRepo.create).mockRejectedValueOnce(
      prismaUniqueError,
    );

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      AffiliationAlreadyExistsError,
    );
  });

  it("propaga cualquier error inesperado dentro de la transacción para garantizar rollback", async () => {
    const unexpectedError = new Error("Fallo de red o base de datos");

    vi.mocked(mockRevisionsRepo.create).mockRejectedValueOnce(unexpectedError);

    await expect(useCase.execute(sampleInput)).rejects.toThrow(
      "Fallo de red o base de datos",
    );
  });
});
