/// ARCHIVO: tests/profiles/catalog-profiles-coordination.unit.test.ts
/// Pruebas unitarias de coordinación transaccional Catalog–Profiles y post-commit notifications (Fase 4 - D5).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProfessionalSpecialtyService } from "@/modules/specialty/ProfessionalSpecialty/ProfessionalSpecialty.Service";
import { NotificationService } from "@/modules/notifications/notifications.service";
import prisma from "@/shared/database/prisma";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    professionalProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    professionalSpecialty: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/modules/notifications/notifications.service", () => ({
  NotificationService: {
    notifySpecialtyApproved: vi.fn().mockResolvedValue(undefined),
    notifySpecialtyRejected: vi.fn().mockResolvedValue(undefined),
    notifyProfileSuspended: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Coordinación Catalog–Profiles (Unit Tests - D5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ProfessionalSpecialtyService.setSpecialtyStatus -> SuspendOnSpecialtyRevokedUseCase", () => {
    it("conecta a Profiles dentro de la transacción de Catalog y suspende si el perfil es APPROVED y queda con 0 especialidades", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 10, verificationStatus: "APPROVED" },
        ]),
        professionalSpecialty: {
          findUnique: vi.fn().mockResolvedValueOnce({
            professionalId: 10,
            specialtyId: 1,
            status: "APPROVED",
          }),
          update: vi.fn().mockResolvedValueOnce({
            professionalId: 10,
            specialtyId: 1,
            status: "REJECTED",
          }),
          count: vi.fn().mockResolvedValueOnce(0),
        },
        professionalProfile: {
          update: vi.fn().mockResolvedValueOnce({
            id: 10,
            verificationStatus: "SUSPENDED",
          }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      const result = await ProfessionalSpecialtyService.setSpecialtyStatus(
        10,
        1,
        "REJECTED"
      );

      expect(result).toEqual({ success: true });
      expect(mockTx.professionalSpecialty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "REJECTED" }),
        })
      );
      expect(mockTx.$queryRaw).toHaveBeenCalled();
      expect(mockTx.professionalProfile.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { verificationStatus: "SUSPENDED" },
      });
      expect(NotificationService.notifySpecialtyRejected).toHaveBeenCalledWith(10);
      expect(NotificationService.notifyProfileSuspended).toHaveBeenCalledWith(10);
    });

    it("preserva el estado REJECTED (terminal) en la ruta activa de ProfessionalSpecialtyService", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 15, verificationStatus: "REJECTED" },
        ]),
        professionalSpecialty: {
          findUnique: vi.fn().mockResolvedValueOnce({
            professionalId: 15,
            specialtyId: 2,
            status: "PENDING",
          }),
          update: vi.fn().mockResolvedValueOnce({
            professionalId: 15,
            specialtyId: 2,
            status: "REJECTED",
          }),
          count: vi.fn(),
        },
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      const result = await ProfessionalSpecialtyService.setSpecialtyStatus(
        15,
        2,
        "REJECTED"
      );

      expect(result).toEqual({ success: true });
      expect(mockTx.professionalSpecialty.update).toHaveBeenCalled();
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("preserva el estado PENDING en la ruta activa de ProfessionalSpecialtyService", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 16, verificationStatus: "PENDING" },
        ]),
        professionalSpecialty: {
          findUnique: vi.fn().mockResolvedValueOnce({
            professionalId: 16,
            specialtyId: 3,
            status: "PENDING",
          }),
          update: vi.fn().mockResolvedValueOnce({
            professionalId: 16,
            specialtyId: 3,
            status: "REJECTED",
          }),
          count: vi.fn(),
        },
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      const result = await ProfessionalSpecialtyService.setSpecialtyStatus(
        16,
        3,
        "REJECTED"
      );

      expect(result).toEqual({ success: true });
      expect(mockTx.professionalSpecialty.update).toHaveBeenCalled();
      expect(mockTx.professionalProfile.update).not.toHaveBeenCalled();
    });

    it("un fallo en la suspensión de Profiles propaga el error y revierte la transacción de Catalog (rollback conjunto)", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 10, verificationStatus: "APPROVED" },
        ]),
        professionalSpecialty: {
          findUnique: vi.fn().mockResolvedValueOnce({
            professionalId: 10,
            specialtyId: 1,
            status: "APPROVED",
          }),
          update: vi.fn().mockResolvedValueOnce({
            professionalId: 10,
            specialtyId: 1,
            status: "REJECTED",
          }),
          count: vi.fn().mockResolvedValueOnce(0),
        },
        professionalProfile: {
          update: vi.fn().mockRejectedValueOnce(new Error("DB Deadlock / Disk Error")),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      await expect(
        ProfessionalSpecialtyService.setSpecialtyStatus(10, 1, "REJECTED")
      ).rejects.toThrow("DB Deadlock / Disk Error");
    });

    it("un fallo en la notificación post-commit no rompe la respuesta exitosa una vez confirmada la BD", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 20, verificationStatus: "APPROVED" },
        ]),
        professionalSpecialty: {
          findUnique: vi.fn().mockResolvedValueOnce({
            professionalId: 20,
            specialtyId: 1,
            status: "PENDING",
          }),
          update: vi.fn().mockResolvedValueOnce({
            professionalId: 20,
            specialtyId: 1,
            status: "APPROVED",
          }),
          count: vi.fn().mockResolvedValueOnce(1),
        },
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      // Simulamos que el servicio de notificaciones falla (red / SMTP caído)
      vi.mocked(NotificationService.notifySpecialtyApproved).mockRejectedValueOnce(
        new Error("SMTP Connection Timeout")
      );

      const result = await ProfessionalSpecialtyService.setSpecialtyStatus(
        20,
        1,
        "APPROVED"
      );

      // La operación debe retornar éxito porque la BD ya hizo commit
      expect(result).toEqual({ success: true });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Fallo observable en notificación post-commit de especialidad:",
        expect.objectContaining({
          professionalId: 20,
          specialtyId: 1,
          newStatus: "APPROVED",
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

