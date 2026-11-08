/// ARCHIVO: tests/profiles/update-professional-profile.use-case.unit.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdateProfessionalProfileUseCase } from "@/modules/profiles/application/use-cases/update-professional-profile.use-case";
import { ProfessionalProfileRepository } from "@/modules/profiles/application/ports/professional-profile-repository.port";
import {
  ProfessionalProfileNotFoundError,
  InvalidProfileDataError,
} from "@/modules/profiles/domain/profile-errors";
import prisma from "@/shared/database/prisma";
import { UsersController } from "@/modules/users/users.controller";
import { AppError } from "@/shared/errors/AppError";
import { UpdateProfessionalProfileSchema } from "@/modules/users/professionalprofile/professionalprofile.dto";
import { ProfessionalProfileService } from "@/modules/users/professionalprofile/professionalprofile.service";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    professionalProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    clientProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("UpdateProfessionalProfile (Misión 3 - Fase 4)", () => {
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

  const useCase = new UpdateProfessionalProfileUseCase(mockRepo);

  describe("UpdateProfessionalProfileUseCase", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("actualiza únicamente nombre, apellido y teléfono del profesional", async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValueOnce({
        id: 1,
        name: "Dr. Antiguo",
        lastName: "Perez",
        phone: null,
        avatar: null,
        description: "Bio privada",
        ratingAvg: 0,
        ratingCount: 0,
        verificationStatus: "APPROVED",
        specialties: [],
        socialLinks: [],
        certificates: [],
      });

      vi.mocked(mockRepo.updateByUserId).mockResolvedValueOnce({
        id: 1,
        name: "Dr. Nuevo",
        lastName: "Perez Gomez",
        phone: "5551234567",
        description: "Bio privada",
      });

      const result = await useCase.execute(20, {
        name: "Dr. Nuevo",
        lastName: "Perez Gomez",
        phone: "5551234567",
      });

      expect(result.name).toBe("Dr. Nuevo");
      expect(result.phone).toBe("5551234567");
      expect(mockRepo.updateByUserId).toHaveBeenCalledWith(20, {
        name: "Dr. Nuevo",
        lastName: "Perez Gomez",
        phone: "5551234567",
      });
    });

    it("filtra 'description' u otros campos no permitidos si son inyectados en runtime", async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValueOnce({
        id: 1,
        name: "Dr. Original",
        lastName: "Lopez",
        phone: null,
        avatar: null,
        description: "Bio original",
        ratingAvg: 0,
        ratingCount: 0,
        verificationStatus: "APPROVED",
        specialties: [],
        socialLinks: [],
        certificates: [],
      });

      vi.mocked(mockRepo.updateByUserId).mockResolvedValueOnce({
        id: 1,
        name: "Dr. Actualizado",
        lastName: "Lopez",
        phone: null,
        description: "Bio original",
      });

      const dirtyInput = {
        name: "Dr. Actualizado",
        description: "Intento de cambiar bio global",
        verificationStatus: "APPROVED",
      } as any;

      await useCase.execute(20, dirtyInput);

      expect(mockRepo.updateByUserId).toHaveBeenCalledWith(20, {
        name: "Dr. Actualizado",
      });
      expect(mockRepo.updateByUserId).not.toHaveBeenCalledWith(
        20,
        expect.objectContaining({ description: expect.anything() })
      );
    });

    it("lanza InvalidProfileDataError si solo se envían campos inyectados como description", async () => {
      const dirtyInput = {
        description: "Intento de cambiar bio global",
      } as any;

      await expect(useCase.execute(20, dirtyInput)).rejects.toThrow(
        InvalidProfileDataError
      );
    });

    it("lanza InvalidProfileDataError si no se envía ningún campo con valor", async () => {
      await expect(
        useCase.execute(20, {
          name: undefined,
          lastName: undefined,
          phone: undefined,
        })
      ).rejects.toThrow(InvalidProfileDataError);
    });

    it("lanza ProfessionalProfileNotFoundError si el profesional no existe", async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValueOnce(null);

      await expect(
        useCase.execute(99, {
          name: "Dr. Fantasma",
        })
      ).rejects.toThrow(ProfessionalProfileNotFoundError);
    });
  });

  describe("UsersController.updateProfile — PROFESSIONAL", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
      vi.clearAllMocks();
      res = {
        json: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };
      next = vi.fn();
    });

    it("filtra inyecciones de campos protegidos (description, rating, verificationStatus, etc.)", async () => {
      req = {
        user: { id: 25, role: "PROFESSIONAL" },
        body: {
          name: "Dr. Alejandro",
          lastName: "Mendoza",
          phone: "5559876543",
          // Campos inyectados no permitidos:
          userId: 999,
          description: "Intento de cambiar bio pública sin pasar por revisión de tenant",
          verificationStatus: "APPROVED",
          ratingAvg: 5.0,
          ratingCount: 1000,
        },
      };

      vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
        id: 5,
        userId: 25,
        name: "Dr. Anterior",
        lastName: "Mendoza",
        phone: null,
        avatar: null,
        description: "Bio original",
        ratingAvg: 0,
        ratingCount: 0,
        verificationStatus: "PENDING",
        specialties: [],
        socialLinks: [],
        certificates: [],
      } as any);

      vi.mocked(prisma.professionalProfile.update).mockResolvedValueOnce({
        id: 5,
        name: "Dr. Alejandro",
        lastName: "Mendoza",
        phone: "5559876543",
        description: "Bio original",
      } as any);

      await UsersController.updateProfile(req, res, next);

      expect(res.json).toHaveBeenCalled();
      // Asegura que update solo recibió name, lastName, phone y que where usa el userId del actor
      expect(prisma.professionalProfile.update).toHaveBeenCalledWith({
        where: { userId: 25 },
        data: {
          name: "Dr. Alejandro",
          lastName: "Mendoza",
          phone: "5559876543",
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("retorna 404 si el perfil profesional no existe", async () => {
      req = {
        user: { id: 77, role: "PROFESSIONAL" },
        body: { name: "Dr. X" },
      };

      vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce(null);

      await UsersController.updateProfile(req, res, next);

      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Perfil profesional no existe");
    });
  });

  describe("UpdateProfessionalProfileSchema & ProfessionalProfileService (Legacy Adapter)", () => {
    it("el schema Zod no incluye el campo description en su definición", () => {
      const parsed = UpdateProfessionalProfileSchema.parse({
        name: "Dr. Carlos",
        lastName: "Gomez",
        phone: "5551122334",
        description: "Esta descripción debe ser ignorada por Zod",
      });

      expect(parsed).toEqual({
        name: "Dr. Carlos",
        lastName: "Gomez",
        phone: "5551122334",
      });
      expect(parsed).not.toHaveProperty("description");
    });

    it("ProfessionalProfileService.updateProfile filtra description y delega sólo los campos permitidos", async () => {
      vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
        id: 10,
        userId: 33,
        name: "Dr. Antiguo",
        lastName: "Perez",
        phone: null,
        avatar: null,
        description: "Bio original de BD",
        ratingAvg: 0,
        ratingCount: 0,
        verificationStatus: "APPROVED",
        specialties: [],
        socialLinks: [],
        certificates: [],
      } as any);

      vi.mocked(prisma.professionalProfile.update).mockResolvedValueOnce({
        id: 10,
        name: "Dr. Nuevo",
        lastName: "Perez",
        phone: null,
        description: "Bio original de BD",
      } as any);

      const legacyInput = {
        name: "Dr. Nuevo",
        description: "Bio inyectada",
      } as any;

      await ProfessionalProfileService.updateProfile(33, legacyInput);

      expect(prisma.professionalProfile.update).toHaveBeenCalledWith({
        where: { userId: 33 },
        data: {
          name: "Dr. Nuevo",
        },
      });
      expect(prisma.professionalProfile.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: expect.anything() }),
        })
      );
    });
  });
});
