/// ARCHIVO: tests/profiles/suspend-on-specialty-revoked.use-case.unit.test.ts
/// Prueba del contrato transaccional conjunto Profiles/Catalog (Fase 4 - D5).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { SuspendOnSpecialtyRevokedUseCase } from "@/modules/profiles/application/use-cases/suspend-on-specialty-revoked.use-case";
import { ProfessionalProfileRepository } from "@/modules/profiles/application/ports/professional-profile-repository.port";
import { CatalogSpecialtyChecker } from "@/modules/profiles/application/ports/catalog-specialty-checker.port";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";

describe("SuspendOnSpecialtyRevokedUseCase — Coordination Contract (D5)", () => {
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

  const useCase = new SuspendOnSpecialtyRevokedUseCase(
    mockRepo,
    mockSpecialtyChecker
  );

  const fakeTxClient = { $isTransaction: true };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UseCase Delegation", () => {
    it("delega la reconciliación atómica al repositorio bajo el mismo contexto transaccional", async () => {
      vi.mocked(mockRepo.reconcileSpecialtyRevocation).mockResolvedValueOnce({
        profileSuspended: true,
        previousStatus: "APPROVED",
      });

      const wasSuspended = await useCase.execute(5, fakeTxClient);

      expect(wasSuspended).toBe(true);
      expect(mockRepo.reconcileSpecialtyRevocation).toHaveBeenCalledWith(
        5,
        mockSpecialtyChecker,
        fakeTxClient
      );
    });

    it("retorna false si el repositorio determina que no debe suspenderse", async () => {
      vi.mocked(mockRepo.reconcileSpecialtyRevocation).mockResolvedValueOnce({
        profileSuspended: false,
        previousStatus: "APPROVED",
      });

      const wasSuspended = await useCase.execute(5, fakeTxClient);

      expect(wasSuspended).toBe(false);
    });

    it("propaga el error si la reconciliación falla para provocar el rollback de la transacción exterior", async () => {
      vi.mocked(mockRepo.reconcileSpecialtyRevocation).mockRejectedValueOnce(
        new Error("DB Connection Error during suspension")
      );

      await expect(useCase.execute(5, fakeTxClient)).rejects.toThrow(
        "DB Connection Error during suspension"
      );
    });
  });

  describe("PrismaProfessionalProfileRepository.reconcileSpecialtyRevocation — Row Locking & Lifecycle Rules", () => {
    const repo = new PrismaProfessionalProfileRepository();

    it("adquiere row lock FOR UPDATE y suspende el perfil APPROVED si no quedan especialidades", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 10, verificationStatus: "APPROVED" },
        ]),
        professionalProfile: {
          update: vi.fn().mockResolvedValueOnce({
            id: 10,
            verificationStatus: "SUSPENDED",
          }),
        },
      };

      vi.mocked(mockSpecialtyChecker.countApprovedSpecialties).mockResolvedValueOnce(0);

      const result = await repo.reconcileSpecialtyRevocation(
        10,
        mockSpecialtyChecker,
        mockTx
      );

      expect(result.profileSuspended).toBe(true);
      expect(result.previousStatus).toBe("APPROVED");
      expect(mockTx.$queryRaw).toHaveBeenCalled();
      expect(mockSpecialtyChecker.countApprovedSpecialties).toHaveBeenCalledWith(
        10,
        mockTx
      );
      expect(mockTx.professionalProfile.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { verificationStatus: "SUSPENDED" },
      });
    });

    it("preserva el estado terminal REJECTED y NUNCA lo pasa a SUSPENDED", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 11, verificationStatus: "REJECTED" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      const result = await repo.reconcileSpecialtyRevocation(
        11,
        mockSpecialtyChecker,
        mockTx
      );

      expect(result.profileSuspended).toBe(false);
      expect(result.previousStatus).toBe("REJECTED");
      expect(mockSpecialtyChecker.countApprovedSpecialties).not.toHaveBeenCalled();
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("preserva el estado PENDING y no lo suspende", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 12, verificationStatus: "PENDING" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      const result = await repo.reconcileSpecialtyRevocation(
        12,
        mockSpecialtyChecker,
        mockTx
      );

      expect(result.profileSuspended).toBe(false);
      expect(result.previousStatus).toBe("PENDING");
      expect(mockSpecialtyChecker.countApprovedSpecialties).not.toHaveBeenCalled();
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("es idempotente si el perfil ya se encuentra en estado SUSPENDED", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 13, verificationStatus: "SUSPENDED" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      const result = await repo.reconcileSpecialtyRevocation(
        13,
        mockSpecialtyChecker,
        mockTx
      );

      expect(result.profileSuspended).toBe(false);
      expect(result.previousStatus).toBe("SUSPENDED");
      expect(mockSpecialtyChecker.countApprovedSpecialties).not.toHaveBeenCalled();
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("no suspende si el perfil APPROVED aún conserva al menos una especialidad aprobada", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 14, verificationStatus: "APPROVED" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(mockSpecialtyChecker.countApprovedSpecialties).mockResolvedValueOnce(1);

      const result = await repo.reconcileSpecialtyRevocation(
        14,
        mockSpecialtyChecker,
        mockTx
      );

      expect(result.profileSuspended).toBe(false);
      expect(result.previousStatus).toBe("APPROVED");
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("retorna false de forma segura si el perfil no existe", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([]),
        professionalProfile: {
          findUnique: vi.fn().mockResolvedValueOnce(null),
          update: vi.fn(),
        },
      };

      const result = await repo.reconcileSpecialtyRevocation(
        99,
        mockSpecialtyChecker,
        mockTx
      );

      expect(result.profileSuspended).toBe(false);
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });
  });
});

