/// ARCHIVO: tests/profiles/professional-profile.controller.unit.test.ts
/// Pruebas unitarias de ProfessionalProfileController (Misión 3 - Fase 4).

import { describe, expect, it, vi, beforeEach } from "vitest";
import prisma from "@/shared/database/prisma";
import { ProfessionalProfileController } from "@/modules/users/professionalprofile/professionalprofile.controller";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    professionalTenantAffiliation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    certificate: {
      findUnique: vi.fn(),
    },
  },
}));

describe("ProfessionalProfileController (Misión 3 - Fase 4)", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      download: vi.fn().mockReturnThis(),
      locals: { tenantId: 10 },
    };
    next = vi.fn();
  });

  describe("getPublic", () => {
    it("devuelve 200 y el perfil público sin verificationStatus", async () => {
      req = {
        params: { id: "1" },
      };

      vi.mocked(prisma.professionalTenantAffiliation.findFirst).mockResolvedValueOnce({
        id: 100,
        professionalProfile: {
          id: 1,
          name: "Doctor",
          lastName: "Prueba",
          avatar: "/avatars/doc.png",
        },
        revisions: [
          {
            description: "Bio aprobada del tenant",
            socialLinks: [{ type: "WEBSITE", url: "https://example.com" }],
          },
        ],
      } as any);

      await ProfessionalProfileController.getPublic(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const output = res.json.mock.calls[0][0];
      expect(output.name).toBe("Doctor");
      expect(output.description).toBe("Bio aprobada del tenant");
      expect(output).not.toHaveProperty("verificationStatus");
      expect(output).not.toHaveProperty("phone");
      expect(next).not.toHaveBeenCalled();
    });

    it("devuelve 404 si el perfil no es publicable o no existe", async () => {
      req = {
        params: { id: "99" },
      };

      vi.mocked(prisma.professionalTenantAffiliation.findFirst).mockResolvedValueOnce(null);

      await ProfessionalProfileController.getPublic(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Perfil profesional no encontrado",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("getAllPublic", () => {
    it("devuelve listado de perfiles públicos sin verificationStatus en ninguno de ellos", async () => {
      req = {};

      vi.mocked(prisma.professionalTenantAffiliation.findMany).mockResolvedValueOnce([
        {
          id: 100,
          professionalProfile: {
            id: 1,
            name: "Dr. Uno",
            lastName: "Perez",
            avatar: null,
          },
          revisions: [{ description: "Bio 1", socialLinks: [] }],
        },
        {
          id: 101,
          professionalProfile: {
            id: 2,
            name: "Dra. Dos",
            lastName: "Gomez",
            avatar: null,
          },
          revisions: [{ description: "Bio 2", socialLinks: [] }],
        },
      ] as any);

      await ProfessionalProfileController.getAllPublic(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const list = res.json.mock.calls[0][0];
      expect(list).toHaveLength(2);
      for (const item of list) {
        expect(item).not.toHaveProperty("verificationStatus");
        expect(item).not.toHaveProperty("phone");
      }
      expect(next).not.toHaveBeenCalled();
    });
  });
});

