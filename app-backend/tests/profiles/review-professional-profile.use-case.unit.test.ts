/// ARCHIVO: tests/profiles/review-professional-profile.use-case.unit.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ReviewProfessionalProfileUseCase,
  ProfileNotificationPort,
} from "@/modules/profiles/application/use-cases/review-professional-profile.use-case";
import { SetProfessionalStatusUseCase } from "@/modules/profiles/application/use-cases/set-professional-status.use-case";
import { ProfessionalProfileRepository } from "@/modules/profiles/application/ports/professional-profile-repository.port";
import { CatalogSpecialtyChecker } from "@/modules/profiles/application/ports/catalog-specialty-checker.port";
import {
  ProfessionalProfileNotFoundError,
  InvalidProfileStatusTransitionError,
  ProfileMissingSpecialtyError,
} from "@/modules/profiles/domain/profile-errors";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";
import prisma from "@/shared/database/prisma";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    professionalProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Review and Set Status Use Cases (Misión 4 - Fase 4)", () => {
  const mockRepo: ProfessionalProfileRepository = {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    updateByUserId: vi.fn(),
    updateAvatar: vi.fn(),
    getPublicById: vi.fn(),
    getAllPublic: vi.fn(),
    getAllProfiles: vi.fn(),
    getPendingProfiles: vi.fn(),
    setStatus: vi.fn(),
    executeTransition: vi.fn(),
    reconcileSpecialtyRevocation: vi.fn(),
  };

  const mockSpecialtyChecker: CatalogSpecialtyChecker = {
    countApprovedSpecialties: vi.fn(),
  };

  const mockNotification: ProfileNotificationPort = {
    notifyProfileApproved: vi.fn(),
    notifyProfileRejected: vi.fn(),
    notifyProfileSuspended: vi.fn(),
  };

  const reviewUseCase = new ReviewProfessionalProfileUseCase(
    mockRepo,
    mockSpecialtyChecker,
    mockNotification
  );

  const setStatusUseCase = new SetProfessionalStatusUseCase(
    mockRepo,
    mockSpecialtyChecker,
    mockNotification
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ReviewProfessionalProfileUseCase", () => {
    it("aprueba exitosamente y emite notificación si hubo cambio de estado", async () => {
      vi.mocked(mockRepo.executeTransition).mockResolvedValueOnce({
        id: 1,
        userId: 100,
        verificationStatus: "APPROVED",
        previousStatus: "PENDING",
      });

      const result = await reviewUseCase.execute({
        profileId: 1,
        status: "APPROVED",
      });

      expect(result.verificationStatus).toBe("APPROVED");
      expect(mockRepo.executeTransition).toHaveBeenCalledWith(
        1,
        "APPROVED",
        mockSpecialtyChecker
      );
      expect(mockNotification.notifyProfileApproved).toHaveBeenCalledWith(100);
    });

    it("es idempotente y no re-notifica si el perfil ya tenía el estado solicitado", async () => {
      vi.mocked(mockRepo.executeTransition).mockResolvedValueOnce({
        id: 1,
        userId: 100,
        verificationStatus: "APPROVED",
        previousStatus: "APPROVED",
      });

      const result = await reviewUseCase.execute({
        profileId: 1,
        status: "APPROVED",
      });

      expect(result.verificationStatus).toBe("APPROVED");
      expect(mockNotification.notifyProfileApproved).not.toHaveBeenCalled();
    });

    it("propaga ProfileMissingSpecialtyError si faltan especialidades aprobadas", async () => {
      vi.mocked(mockRepo.executeTransition).mockRejectedValueOnce(
        new ProfileMissingSpecialtyError()
      );

      await expect(
        reviewUseCase.execute({
          profileId: 1,
          status: "APPROVED",
        })
      ).rejects.toThrow(ProfileMissingSpecialtyError);

      expect(mockNotification.notifyProfileApproved).not.toHaveBeenCalled();
    });

    it("rechaza transición inválida y no notifica", async () => {
      vi.mocked(mockRepo.executeTransition).mockRejectedValueOnce(
        new InvalidProfileStatusTransitionError("REJECTED", "APPROVED")
      );

      await expect(
        reviewUseCase.execute({
          profileId: 1,
          status: "APPROVED",
        })
      ).rejects.toThrow(InvalidProfileStatusTransitionError);

      expect(mockNotification.notifyProfileApproved).not.toHaveBeenCalled();
    });

    it("no falla si la notificación post-commit falla (best-effort con log)", async () => {
      vi.mocked(mockRepo.executeTransition).mockResolvedValueOnce({
        id: 1,
        userId: 100,
        verificationStatus: "APPROVED",
        previousStatus: "PENDING",
      });
      vi.mocked(mockNotification.notifyProfileApproved).mockRejectedValueOnce(
        new Error("Mail server unreachable")
      );

      const result = await reviewUseCase.execute({
        profileId: 1,
        status: "APPROVED",
      });

      expect(result.verificationStatus).toBe("APPROVED");
    });
  });

  describe("SetProfessionalStatusUseCase", () => {
    it("suspende exitosamente un perfil APPROVED y notifica", async () => {
      vi.mocked(mockRepo.executeTransition).mockResolvedValueOnce({
        id: 2,
        userId: 200,
        verificationStatus: "SUSPENDED",
        previousStatus: "APPROVED",
      });

      const result = await setStatusUseCase.execute({
        profileId: 2,
        status: "SUSPENDED",
      });

      expect(result.verificationStatus).toBe("SUSPENDED");
      expect(mockRepo.executeTransition).toHaveBeenCalledWith(
        2,
        "SUSPENDED",
        mockSpecialtyChecker
      );
      expect(mockNotification.notifyProfileSuspended).toHaveBeenCalledWith(200);
    });
  });

  describe("PrismaProfessionalProfileRepository.executeTransition — Atomicity & Row Locking", () => {
    const repo = new PrismaProfessionalProfileRepository();

    it("adquiere bloqueo FOR UPDATE y completa la transición bajo la transacción", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 10, userId: 100, verificationStatus: "PENDING" },
        ]),
        professionalProfile: {
          update: vi.fn().mockResolvedValueOnce({
            id: 10,
            userId: 100,
            verificationStatus: "APPROVED",
          }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );
      vi.mocked(mockSpecialtyChecker.countApprovedSpecialties).mockResolvedValueOnce(1);

      const result = await repo.executeTransition(
        10,
        "APPROVED",
        mockSpecialtyChecker
      );

      expect(result.verificationStatus).toBe("APPROVED");
      expect(result.previousStatus).toBe("PENDING");
      expect(mockTx.$queryRaw).toHaveBeenCalled();
      expect(mockSpecialtyChecker.countApprovedSpecialties).toHaveBeenCalledWith(
        10,
        mockTx
      );
      expect(mockTx.professionalProfile.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { verificationStatus: "APPROVED" },
        select: { id: true, userId: true, verificationStatus: true },
      });
    });

    it("detecta carreras concurrentes y aborta si faltan especialidades aprobadas bajo el lock", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 10, userId: 100, verificationStatus: "PENDING" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );
      // Revocación concurrente: al momento de evaluar bajo el lock, hay 0 especialidades
      vi.mocked(mockSpecialtyChecker.countApprovedSpecialties).mockResolvedValueOnce(0);

      await expect(
        repo.executeTransition(10, "APPROVED", mockSpecialtyChecker)
      ).rejects.toThrow(ProfileMissingSpecialtyError);

      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("aborta si el perfil ya fue rechazado (estado terminal) por una revisión concurrente", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 10, userId: 100, verificationStatus: "REJECTED" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      await expect(
        repo.executeTransition(10, "APPROVED", mockSpecialtyChecker)
      ).rejects.toThrow(InvalidProfileStatusTransitionError);

      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("es idempotente bajo el lock si una solicitud concurrente ya aplicó el estado objetivo", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 10, userId: 100, verificationStatus: "APPROVED" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      const result = await repo.executeTransition(
        10,
        "APPROVED",
        mockSpecialtyChecker
      );

      expect(result.verificationStatus).toBe("APPROVED");
      expect(result.previousStatus).toBe("APPROVED");
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("reutiliza el txClient externo sin abrir transacciones independientes", async () => {
      const externalTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 20, userId: 200, verificationStatus: "APPROVED" },
        ]),
        professionalProfile: {
          update: vi.fn().mockResolvedValueOnce({
            id: 20,
            userId: 200,
            verificationStatus: "SUSPENDED",
          }),
        },
      };

      const result = await repo.executeTransition(
        20,
        "SUSPENDED",
        mockSpecialtyChecker,
        externalTx
      );

      expect(result.verificationStatus).toBe("SUSPENDED");
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(externalTx.professionalProfile.update).toHaveBeenCalled();
    });
  });
});

