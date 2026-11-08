/// ARCHIVO: tests/profiles/admin-operations.controller.unit.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AdminController } from "@/modules/admin/admin.controller";
import prisma from "@/shared/database/prisma";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    professionalProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    professionalSpecialty: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/modules/notifications/notifications.service", () => ({
  NotificationService: {
    notifyProfileApproved: vi.fn().mockResolvedValue(undefined),
    notifyProfileRejected: vi.fn().mockResolvedValue(undefined),
    notifyProfileSuspended: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("AdminController — Profile Operations (Misión 4 - Fase 4)", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe("reviewProfessionalProfile", () => {
    it("retorna 400 si el status enviado no es APPROVED ni REJECTED", async () => {
      req = {
        params: { profileId: "5" },
        body: { status: "SUSPENDED" },
      };

      await AdminController.reviewProfessionalProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Status inválido" });
    });

    it("retorna 200 al aprobar exitosamente con especialidades aprobadas", async () => {
      req = {
        params: { profileId: "5" },
        body: { status: "APPROVED" },
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 5, userId: 50, verificationStatus: "PENDING" },
        ]),
        professionalProfile: {
          update: vi.fn().mockResolvedValueOnce({
            id: 5,
            userId: 50,
            verificationStatus: "APPROVED",
          }),
        },
        professionalSpecialty: {
          count: vi.fn().mockResolvedValueOnce(1),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      await AdminController.reviewProfessionalProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Perfil revisado correctamente",
          profile: expect.objectContaining({ verificationStatus: "APPROVED" }),
        })
      );
    });

    it("retorna 400 si se intenta aprobar sin especialidades aprobadas", async () => {
      req = {
        params: { profileId: "5" },
        body: { status: "APPROVED" },
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 5, userId: 50, verificationStatus: "PENDING" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
        professionalSpecialty: {
          count: vi.fn().mockResolvedValueOnce(0),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      await AdminController.reviewProfessionalProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("especialidad"),
        })
      );
    });

    it("retorna 404 si el perfil no existe", async () => {
      req = {
        params: { profileId: "99" },
        body: { status: "APPROVED" },
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([]),
        professionalProfile: {
          findUnique: vi.fn().mockResolvedValueOnce(null),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      await AdminController.reviewProfessionalProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("no encontrado"),
        })
      );
    });
  });

  describe("setProfileStatus", () => {
    it("retorna 400 si el status enviado no es APPROVED ni SUSPENDED", async () => {
      req = {
        params: { profileId: "5" },
        body: { status: "REJECTED" },
      };

      await AdminController.setProfileStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Status inválido" });
    });

    it("retorna 200 al suspender exitosamente un perfil APPROVED", async () => {
      req = {
        params: { profileId: "5" },
        body: { status: "SUSPENDED" },
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 5, userId: 50, verificationStatus: "APPROVED" },
        ]),
        professionalProfile: {
          update: vi.fn().mockResolvedValueOnce({
            id: 5,
            userId: 50,
            verificationStatus: "SUSPENDED",
          }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      await AdminController.setProfileStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Estado del perfil actualizado correctamente",
          profile: expect.objectContaining({ verificationStatus: "SUSPENDED" }),
        })
      );
    });

    it("retorna 400 si se intenta suspender un perfil REJECTED (estado terminal)", async () => {
      req = {
        params: { profileId: "5" },
        body: { status: "SUSPENDED" },
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([
          { id: 5, userId: 50, verificationStatus: "REJECTED" },
        ]),
        professionalProfile: {
          update: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx)
      );

      await AdminController.setProfileStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Transición inválida"),
        })
      );
    });
  });

  describe("getPendingProfiles & getAllProfiles", () => {
    it("getPendingProfiles retorna la lista de perfiles pendientes", async () => {
      req = {};
      vi.mocked(prisma.professionalProfile.findMany).mockResolvedValueOnce([
        { id: 1, verificationStatus: "PENDING" } as any,
      ]);

      await AdminController.getPendingProfiles(req, res);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ verificationStatus: "PENDING" }),
      ]);
    });

    it("getAllProfiles retorna todos los perfiles", async () => {
      req = {};
      vi.mocked(prisma.professionalProfile.findMany).mockResolvedValueOnce([
        { id: 1, verificationStatus: "APPROVED" } as any,
        { id: 2, verificationStatus: "SUSPENDED" } as any,
      ]);

      await AdminController.getAllProfiles(req, res);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
      ]);
    });
  });
});

