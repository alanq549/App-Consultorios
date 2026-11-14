/// ARCHIVO: tests/catalog/specialty.controller.unit.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SpecialtyController } from "@/modules/catalog/http/specialty.controller";
import {
  DuplicateSpecialtyError,
  SpecialtyNotFoundError,
} from "@/modules/catalog/domain/catalog-errors";

describe("SpecialtyController — Pure Unit Tests with Dependency Injection (Misión 1 - Fase 5)", () => {
  let controller: SpecialtyController;
  let mockDeps: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = {
      createSpecialtyUseCase: { execute: vi.fn() },
      listActiveSpecialtiesUseCase: { execute: vi.fn() },
      listInactiveSpecialtiesUseCase: { execute: vi.fn() },
      updateSpecialtyUseCase: { execute: vi.fn() },
      deactivateSpecialtyUseCase: { execute: vi.fn() },
      restoreSpecialtyUseCase: { execute: vi.fn() },
      listProfessionalPublicSpecialtiesUseCase: { execute: vi.fn() },
    };
    controller = new SpecialtyController(mockDeps);
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: {},
    };
  });

  describe("create", () => {
    it("retorna 201 y el DTO al crear exitosamente", async () => {
      req = {
        body: {
          name: "Geriatría",
          description: "Atención a adultos mayores",
        },
      };

      mockDeps.createSpecialtyUseCase.execute.mockResolvedValue({
        id: 10,
        name: "Geriatría",
        description: "Atención a adultos mayores",
        isActive: true,
        createdAt: "2026-11-10T12:00:00.000Z",
        updatedAt: "2026-11-10T12:00:00.000Z",
      });

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          name: "Geriatría",
          isActive: true,
        }),
      );
    });

    it("lanza AppError con status 409 cuando la especialidad activa ya existe", async () => {
      req = {
        body: { name: "Cardiología" },
      };

      mockDeps.createSpecialtyUseCase.execute.mockRejectedValue(
        new DuplicateSpecialtyError("La especialidad ya existe"),
      );

      await expect(controller.create(req, res)).rejects.toMatchObject({
        statusCode: 409,
        message: "La especialidad ya existe",
      });
    });
  });

  describe("list & list_soft_delete", () => {
    it("list retorna 200 con el listado de especialidades activas", async () => {
      req = {};
      mockDeps.listActiveSpecialtiesUseCase.execute.mockResolvedValue([
        {
          id: 1,
          name: "Cardiología",
          description: null,
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]);

      await controller.list(req, res);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          name: "Cardiología",
          isActive: true,
        }),
      ]);
    });

    it("list_soft_delete retorna 200 con especialidades inactivas", async () => {
      req = {};
      mockDeps.listInactiveSpecialtiesUseCase.execute.mockResolvedValue([
        {
          id: 2,
          name: "Especialidad Obsoleta",
          description: null,
          isActive: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]);

      await controller.list_soft_delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 2,
          name: "Especialidad Obsoleta",
          isActive: false,
        }),
      ]);
    });
  });

  describe("update", () => {
    it("retorna 200 con la especialidad actualizada", async () => {
      req = {
        params: { id: "5" },
        body: { description: "Nueva descripción" },
      };

      mockDeps.updateSpecialtyUseCase.execute.mockResolvedValue({
        id: 5,
        name: "Infectología",
        description: "Nueva descripción",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });

      await controller.update(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 5,
          description: "Nueva descripción",
        }),
      );
    });

    it("lanza AppError con status 404 si la especialidad no existe", async () => {
      req = {
        params: { id: "999" },
        body: { name: "Nueva" },
      };

      mockDeps.updateSpecialtyUseCase.execute.mockRejectedValue(
        new SpecialtyNotFoundError("Especialidad no encontrada"),
      );

      await expect(controller.update(req, res)).rejects.toMatchObject({
        statusCode: 404,
        message: "Especialidad no encontrada",
      });
    });
  });

  describe("restore & remove", () => {
    it("restore retorna 200 y activa la especialidad", async () => {
      req = { params: { id: "3" } };

      mockDeps.restoreSpecialtyUseCase.execute.mockResolvedValue({
        id: 3,
        name: "Reumatología",
        description: null,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });

      await controller.restore(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 3,
          isActive: true,
        }),
      );
    });

    it("remove retorna 204 No Content y desactiva la especialidad", async () => {
      req = { params: { id: "3" } };

      mockDeps.deactivateSpecialtyUseCase.execute.mockResolvedValue({
        id: 3,
        name: "Reumatología",
        description: null,
        isActive: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("listByProfessional (Proyección pública sin estados de elegibilidad - Hallazgos 1 y 2)", () => {
    it("retorna 404 si el profesional no tiene afiliación activa en el tenant", async () => {
      req = {
        params: { profileId: "10" },
      };
      res.locals = { tenantId: 2 };

      mockDeps.listProfessionalPublicSpecialtiesUseCase.execute.mockResolvedValue(null);

      await controller.listByProfessional(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Perfil profesional no encontrado",
      });
    });

    it("retorna 200 con la proyección pública cuando está afiliado", async () => {
      req = {
        params: { profileId: "10" },
      };
      res.locals = { tenantId: 1 };

      mockDeps.listProfessionalPublicSpecialtiesUseCase.execute.mockResolvedValue([
        {
          specialtyId: 5,
          name: "Pediatría",
          description: "Atención pediátrica",
          specialty: {
            id: 5,
            name: "Pediatría",
            description: "Atención pediátrica",
          },
        },
      ]);

      await controller.listByProfessional(req, res);

      expect(res.json).toHaveBeenCalledWith([
        {
          specialtyId: 5,
          name: "Pediatría",
          description: "Atención pediátrica",
          specialty: {
            id: 5,
            name: "Pediatría",
            description: "Atención pediátrica",
          },
        },
      ]);
    });
  });
});
