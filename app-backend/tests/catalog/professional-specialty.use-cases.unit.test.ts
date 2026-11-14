/// ARCHIVO: tests/catalog/professional-specialty.use-cases.unit.test.ts
/// Pruebas unitarias de casos de uso de elegibilidad profesional (Misión 2 - Fase 5).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequestProfessionalSpecialtyUseCase } from "@/modules/catalog/application/use-cases/request-professional-specialty.use-case";
import { ReviewProfessionalSpecialtyUseCase } from "@/modules/catalog/application/use-cases/review-professional-specialty.use-case";
import { SpecialtyRepository } from "@/modules/catalog/domain/repositories/specialty.repository";
import { ProfessionalSpecialtyRepository } from "@/modules/catalog/domain/repositories/professional-specialty.repository";
import { ProfileSuspensionPort } from "@/modules/catalog/application/ports/profile-suspension.port";
import { ProfessionalProfilePort } from "@/modules/catalog/application/ports/professional-profile-lookup.port";
import { CatalogNotificationPort } from "@/modules/catalog/application/ports/catalog-notification.port";
import { TransactionRunner, TransactionContext } from "@/shared/types/transaction-context";
import { Specialty } from "@/modules/catalog/domain/specialty.entity";
import {
  ProfessionalSpecialty,
  ProfessionalSpecialtyStatus,
} from "@/modules/catalog/domain/professional-specialty.entity";
import {
  SpecialtyInactiveError,
  ProfessionalSpecialtyAlreadyExistsError,
  MaxPendingSpecialtiesExceededError,
  ProfessionalSpecialtyNotFoundError,
  InvalidSpecialtyStatusError,
  InvalidSpecialtyTransitionError,
} from "@/modules/catalog/domain/catalog-errors";

class FakeTransactionRunner implements TransactionRunner {
  public rolledBack = false;

  constructor(private readonly profilePort?: FakeProfessionalProfilePort) {}

  async run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const fakeTx: TransactionContext = { transactionId: "fake-tx-id" };
    try {
      return await fn(fakeTx);
    } catch (error) {
      this.rolledBack = true;
      throw error;
    } finally {
      if (this.profilePort) {
        this.profilePort.clearLocks();
      }
    }
  }
}

class FakeSpecialtyRepository implements Partial<SpecialtyRepository> {
  public specialties: Map<number, Specialty> = new Map();

  async findById(id: number): Promise<Specialty | null> {
    return this.specialties.get(id) ?? null;
  }
}

class FakeProfessionalSpecialtyRepository implements ProfessionalSpecialtyRepository {
  public records: Map<string, ProfessionalSpecialty> = new Map();

  private key(professionalId: number, specialtyId: number): string {
    return `${professionalId}:${specialtyId}`;
  }

  async findByProfessionalAndSpecialty(
    professionalId: number,
    specialtyId: number
  ): Promise<ProfessionalSpecialty | null> {
    return this.records.get(this.key(professionalId, specialtyId)) ?? null;
  }

  async countPendingByProfessional(professionalId: number): Promise<number> {
    let count = 0;
    for (const rel of this.records.values()) {
      if (rel.professionalId === professionalId && rel.status === "PENDING") {
        count++;
      }
    }
    return count;
  }

  async countApprovedByProfessional(professionalId: number): Promise<number> {
    let count = 0;
    for (const rel of this.records.values()) {
      if (rel.professionalId === professionalId && rel.status === "APPROVED") {
        count++;
      }
    }
    return count;
  }

  async save(relation: ProfessionalSpecialty): Promise<ProfessionalSpecialty> {
    this.records.set(
      this.key(relation.professionalId, relation.specialtyId),
      relation
    );
    return relation;
  }

  async updateStatus(
    professionalId: number,
    specialtyId: number,
    status: ProfessionalSpecialtyStatus,
    reviewedAt: Date | null
  ): Promise<ProfessionalSpecialty> {
    const existing = await this.findByProfessionalAndSpecialty(
      professionalId,
      specialtyId
    );
    if (!existing) {
      throw new Error("Not found");
    }

    const updated = new ProfessionalSpecialty({
      professionalId: existing.professionalId,
      specialtyId: existing.specialtyId,
      status,
      requestedAt: existing.requestedAt,
      reviewedAt,
    });

    this.records.set(this.key(professionalId, specialtyId), updated);
    return updated;
  }
}

class FakeProfessionalProfilePort implements ProfessionalProfilePort {
  private locks: Set<number> = new Set();
  public lockCallOrder: string[] = [];

  async findProfileIdByUserId(userId: number): Promise<number | null> {
    return userId === 1 ? 10 : null;
  }

  async lockProfileForUpdate(profileId: number): Promise<void> {
    this.lockCallOrder.push(`lock:${profileId}`);
    // Simula espera si ya estuviese bloqueado
    while (this.locks.has(profileId)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.locks.add(profileId);
  }

  releaseLock(profileId: number): void {
    this.locks.delete(profileId);
  }

  clearLocks(): void {
    this.locks.clear();
  }
}

describe("Professional Specialty Use Cases (Unit Tests - Misión 2)", () => {
  let specialtyRepo: FakeSpecialtyRepository;
  let professionalSpecialtyRepo: FakeProfessionalSpecialtyRepository;
  let professionalProfilePort: FakeProfessionalProfilePort;
  let notificationPort: CatalogNotificationPort;
  let profileSuspensionPort: ProfileSuspensionPort;
  let transactionRunner: FakeTransactionRunner;

  beforeEach(() => {
    specialtyRepo = new FakeSpecialtyRepository();
    professionalSpecialtyRepo = new FakeProfessionalSpecialtyRepository();
    professionalProfilePort = new FakeProfessionalProfilePort();
    transactionRunner = new FakeTransactionRunner(professionalProfilePort);

    notificationPort = {
      notifySpecialtyRequested: vi.fn().mockResolvedValue(undefined),
      notifySpecialtyApproved: vi.fn().mockResolvedValue(undefined),
      notifySpecialtyRejected: vi.fn().mockResolvedValue(undefined),
      notifyProfileSuspended: vi.fn().mockResolvedValue(undefined),
    };

    profileSuspensionPort = {
      suspendIfNoApprovedSpecialties: vi.fn().mockResolvedValue(false),
    };
  });

  describe("RequestProfessionalSpecialtyUseCase", () => {
    it("adquiere lock sobre el perfil antes de contar y crea exitosamente la solicitud PENDING", async () => {
      specialtyRepo.specialties.set(
        1,
        Specialty.create({ id: 1, name: "Cardiología", isActive: true })
      );

      const useCase = new RequestProfessionalSpecialtyUseCase(
        specialtyRepo as unknown as SpecialtyRepository,
        professionalSpecialtyRepo,
        professionalProfilePort,
        notificationPort,
        transactionRunner
      );

      const result = await useCase.execute({ professionalId: 10, specialtyId: 1 });

      expect(result.professionalId).toBe(10);
      expect(result.specialtyId).toBe(1);
      expect(result.status).toBe("PENDING");
      expect(result.reviewedAt).toBeNull();

      expect(professionalProfilePort.lockCallOrder).toContain("lock:10");
      expect(notificationPort.notifySpecialtyRequested).toHaveBeenCalledWith(10);
    });

    it("falla si la especialidad no existe o está desactivada", async () => {
      specialtyRepo.specialties.set(
        2,
        Specialty.create({ id: 2, name: "Inactiva", isActive: false })
      );

      const useCase = new RequestProfessionalSpecialtyUseCase(
        specialtyRepo as unknown as SpecialtyRepository,
        professionalSpecialtyRepo,
        professionalProfilePort,
        notificationPort,
        transactionRunner
      );

      // Inexistente
      await expect(
        useCase.execute({ professionalId: 10, specialtyId: 999 })
      ).rejects.toThrow(SpecialtyInactiveError);

      // Inactiva
      await expect(
        useCase.execute({ professionalId: 10, specialtyId: 2 })
      ).rejects.toThrow(SpecialtyInactiveError);
    });

    it("falla si el profesional ya solicitó esa especialidad", async () => {
      specialtyRepo.specialties.set(
        1,
        Specialty.create({ id: 1, name: "Cardiología", isActive: true })
      );
      professionalSpecialtyRepo.records.set(
        "10:1",
        ProfessionalSpecialty.createRequest(10, 1)
      );

      const useCase = new RequestProfessionalSpecialtyUseCase(
        specialtyRepo as unknown as SpecialtyRepository,
        professionalSpecialtyRepo,
        professionalProfilePort,
        notificationPort,
        transactionRunner
      );

      await expect(
        useCase.execute({ professionalId: 10, specialtyId: 1 })
      ).rejects.toThrow(ProfessionalSpecialtyAlreadyExistsError);
    });

    it("falla si el profesional ya tiene 2 o más solicitudes pendientes (límite estricto)", async () => {
      specialtyRepo.specialties.set(
        3,
        Specialty.create({ id: 3, name: "Pediatría", isActive: true })
      );
      professionalSpecialtyRepo.records.set(
        "10:1",
        ProfessionalSpecialty.createRequest(10, 1)
      );
      professionalSpecialtyRepo.records.set(
        "10:2",
        ProfessionalSpecialty.createRequest(10, 2)
      );

      const useCase = new RequestProfessionalSpecialtyUseCase(
        specialtyRepo as unknown as SpecialtyRepository,
        professionalSpecialtyRepo,
        professionalProfilePort,
        notificationPort,
        transactionRunner
      );

      await expect(
        useCase.execute({ professionalId: 10, specialtyId: 3 })
      ).rejects.toThrow(MaxPendingSpecialtiesExceededError);
    });

    it("protege contra condiciones de carrera serializando solicitudes concurrentes (P1)", async () => {
      // El profesional ya tiene 1 pendiente
      professionalSpecialtyRepo.records.set(
        "10:1",
        ProfessionalSpecialty.createRequest(10, 1)
      );

      specialtyRepo.specialties.set(
        2,
        Specialty.create({ id: 2, name: "Dermatología", isActive: true })
      );
      specialtyRepo.specialties.set(
        3,
        Specialty.create({ id: 3, name: "Neurología", isActive: true })
      );

      // Runner con lock real para serialización concurrente
      class SerializingTransactionRunner implements TransactionRunner {
        async run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
          const fakeTx: TransactionContext = { transactionId: "fake-tx-id" };
          try {
            return await fn(fakeTx);
          } finally {
            professionalProfilePort.releaseLock(10);
          }
        }
      }

      const useCase = new RequestProfessionalSpecialtyUseCase(
        specialtyRepo as unknown as SpecialtyRepository,
        professionalSpecialtyRepo,
        professionalProfilePort,
        notificationPort,
        new SerializingTransactionRunner()
      );

      // Lanzar 2 solicitudes simultáneas para el mismo profesional (cuota disponible: solo 1 cupo restante)
      const results = await Promise.allSettled([
        useCase.execute({ professionalId: 10, specialtyId: 2 }),
        useCase.execute({ professionalId: 10, specialtyId: 3 }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactamente una debió tener éxito y la otra debió fallar por cuota excedida
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionReason).toBeInstanceOf(MaxPendingSpecialtiesExceededError);

      // El conteo final de pendientes no supera 2
      const totalPending = await professionalSpecialtyRepo.countPendingByProfessional(10);
      expect(totalPending).toBe(2);
    });

    it("un fallo en la notificación post-commit no rompe la solicitud ya persistida", async () => {
      specialtyRepo.specialties.set(
        1,
        Specialty.create({ id: 1, name: "Cardiología", isActive: true })
      );
      vi.mocked(notificationPort.notifySpecialtyRequested).mockRejectedValueOnce(
        new Error("Fallo de red en mensajería")
      );
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const useCase = new RequestProfessionalSpecialtyUseCase(
        specialtyRepo as unknown as SpecialtyRepository,
        professionalSpecialtyRepo,
        professionalProfilePort,
        notificationPort,
        transactionRunner
      );

      const result = await useCase.execute({ professionalId: 10, specialtyId: 1 });

      expect(result.status).toBe("PENDING");
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("ReviewProfessionalSpecialtyUseCase", () => {
    it("falla con InvalidSpecialtyStatusError si el estado no es APPROVED o REJECTED", async () => {
      const useCase = new ReviewProfessionalSpecialtyUseCase(
        professionalSpecialtyRepo,
        profileSuspensionPort,
        notificationPort,
        transactionRunner
      );

      await expect(
        useCase.execute({
          professionalId: 10,
          specialtyId: 1,
          status: "PENDING" as any,
        })
      ).rejects.toThrow(InvalidSpecialtyStatusError);
    });

    it("falla con ProfessionalSpecialtyNotFoundError si la especialidad no está asignada", async () => {
      const useCase = new ReviewProfessionalSpecialtyUseCase(
        professionalSpecialtyRepo,
        profileSuspensionPort,
        notificationPort,
        transactionRunner
      );

      await expect(
        useCase.execute({
          professionalId: 10,
          specialtyId: 999,
          status: "APPROVED",
        })
      ).rejects.toThrow(ProfessionalSpecialtyNotFoundError);
    });

    it("rechaza reabrir una especialidad en estado terminal REJECTED (P2 - Finding 2)", async () => {
      // Especialidad previamente REJECTED
      professionalSpecialtyRepo.records.set(
        "10:1",
        new ProfessionalSpecialty({
          professionalId: 10,
          specialtyId: 1,
          status: "REJECTED",
          requestedAt: new Date(),
          reviewedAt: new Date(),
        })
      );

      const useCase = new ReviewProfessionalSpecialtyUseCase(
        professionalSpecialtyRepo,
        profileSuspensionPort,
        notificationPort,
        transactionRunner
      );

      // Intentar transicionar de REJECTED a APPROVED debe fallar
      await expect(
        useCase.execute({
          professionalId: 10,
          specialtyId: 1,
          status: "APPROVED",
        })
      ).rejects.toThrow(InvalidSpecialtyTransitionError);

      // El registro sigue en estado REJECTED
      const record = await professionalSpecialtyRepo.findByProfessionalAndSpecialty(10, 1);
      expect(record?.status).toBe("REJECTED");
    });

    it("aprueba exitosamente la especialidad y notifica", async () => {
      professionalSpecialtyRepo.records.set(
        "10:1",
        ProfessionalSpecialty.createRequest(10, 1)
      );

      const useCase = new ReviewProfessionalSpecialtyUseCase(
        professionalSpecialtyRepo,
        profileSuspensionPort,
        notificationPort,
        transactionRunner
      );

      const result = await useCase.execute({
        professionalId: 10,
        specialtyId: 1,
        status: "APPROVED",
      });

      expect(result).toEqual({ success: true });
      const record = await professionalSpecialtyRepo.findByProfessionalAndSpecialty(10, 1);
      expect(record?.status).toBe("APPROVED");
      expect(record?.reviewedAt).not.toBeNull();
      expect(notificationPort.notifySpecialtyApproved).toHaveBeenCalledWith(10);
      expect(notificationPort.notifyProfileSuspended).not.toHaveBeenCalled();
    });

    it("rechaza la especialidad, suspende el perfil si quedó sin especialidades y notifica suspensión", async () => {
      professionalSpecialtyRepo.records.set(
        "10:1",
        new ProfessionalSpecialty({
          professionalId: 10,
          specialtyId: 1,
          status: "APPROVED",
          requestedAt: new Date(),
        })
      );
      vi.mocked(profileSuspensionPort.suspendIfNoApprovedSpecialties).mockResolvedValueOnce(
        true
      );

      const useCase = new ReviewProfessionalSpecialtyUseCase(
        professionalSpecialtyRepo,
        profileSuspensionPort,
        notificationPort,
        transactionRunner
      );

      const result = await useCase.execute({
        professionalId: 10,
        specialtyId: 1,
        status: "REJECTED",
      });

      expect(result).toEqual({ success: true });
      const record = await professionalSpecialtyRepo.findByProfessionalAndSpecialty(10, 1);
      expect(record?.status).toBe("REJECTED");
      expect(profileSuspensionPort.suspendIfNoApprovedSpecialties).toHaveBeenCalled();
      expect(notificationPort.notifySpecialtyRejected).toHaveBeenCalledWith(10);
      expect(notificationPort.notifyProfileSuspended).toHaveBeenCalledWith(10);
    });

    it("propaga el error y hace rollback si la suspensión en Profiles falla", async () => {
      professionalSpecialtyRepo.records.set(
        "10:1",
        new ProfessionalSpecialty({
          professionalId: 10,
          specialtyId: 1,
          status: "APPROVED",
          requestedAt: new Date(),
        })
      );
      vi.mocked(profileSuspensionPort.suspendIfNoApprovedSpecialties).mockRejectedValueOnce(
        new Error("Fallo de base de datos en bloqueo de perfiles")
      );

      const useCase = new ReviewProfessionalSpecialtyUseCase(
        professionalSpecialtyRepo,
        profileSuspensionPort,
        notificationPort,
        transactionRunner
      );

      await expect(
        useCase.execute({
          professionalId: 10,
          specialtyId: 1,
          status: "REJECTED",
        })
      ).rejects.toThrow("Fallo de base de datos en bloqueo de perfiles");

      expect(transactionRunner.rolledBack).toBe(true);
      expect(notificationPort.notifySpecialtyRejected).not.toHaveBeenCalled();
      expect(notificationPort.notifyProfileSuspended).not.toHaveBeenCalled();
    });
  });
});
