/// ARCHIVO: tests/catalog/professional-specialty.controller.unit.test.ts
/// Pruebas unitarias del controlador HTTP de ProfessionalSpecialty (Catalog).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { ProfessionalSpecialtyController } from "@/modules/catalog/http/professional-specialty.controller";
import { RequestProfessionalSpecialtyUseCase } from "@/modules/catalog/application/use-cases/request-professional-specialty.use-case";
import { ReviewProfessionalSpecialtyUseCase } from "@/modules/catalog/application/use-cases/review-professional-specialty.use-case";
import { ProfessionalProfilePort } from "@/modules/catalog/application/ports/professional-profile-lookup.port";
import {
  MaxPendingSpecialtiesExceededError,
  ProfessionalSpecialtyNotFoundError,
  InvalidSpecialtyTransitionError,
  ProfessionalSpecialtyAlreadyExistsError,
} from "@/modules/catalog/domain/catalog-errors";
import { AppError } from "@/shared/errors/AppError";

describe("ProfessionalSpecialtyController (Unit Tests)", () => {
  let mockRequestUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockReviewUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockProfilePort: {
    findProfileIdByUserId: ReturnType<typeof vi.fn>;
    lockProfileForUpdate: ReturnType<typeof vi.fn>;
  };
  let controller: ProfessionalSpecialtyController;

  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRequestUseCase = { execute: vi.fn() };
    mockReviewUseCase = { execute: vi.fn() };
    mockProfilePort = {
      findProfileIdByUserId: vi.fn(),
      lockProfileForUpdate: vi.fn(),
    };

    controller = new ProfessionalSpecialtyController(
      mockRequestUseCase as unknown as RequestProfessionalSpecialtyUseCase,
      mockReviewUseCase as unknown as ReviewProfessionalSpecialtyUseCase,
      mockProfilePort as unknown as ProfessionalProfilePort
    );

    jsonMock = vi.fn().mockReturnThis();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    next = vi.fn();

    res = {
      status: statusMock as unknown as Response["status"],
      json: jsonMock as unknown as Response["json"],
    };
  });

  describe("requestSpecialty", () => {
    it("devuelve 401 si no hay usuario autenticado", async () => {
      req = { params: { specialtyId: "1" } };

      await controller.requestSpecialty(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Usuario no autenticado" });
    });

    it("devuelve 400 si specialtyId es inválido", async () => {
      req = { user: { id: 1 } as any, params: { specialtyId: "abc" } };

      await controller.requestSpecialty(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "specialtyId inválido" });
    });

    it("devuelve 404 si el perfil profesional no existe", async () => {
      req = { user: { id: 1 } as any, params: { specialtyId: "5" } };
      mockProfilePort.findProfileIdByUserId.mockResolvedValueOnce(null);

      await controller.requestSpecialty(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Perfil profesional no encontrado",
      });
    });

    it("devuelve 201 y data de la solicitud cuando es exitosa", async () => {
      req = { user: { id: 1 } as any, params: { specialtyId: "5" } };
      mockProfilePort.findProfileIdByUserId.mockResolvedValueOnce(10);
      mockRequestUseCase.execute.mockResolvedValueOnce({
        professionalId: 10,
        specialtyId: 5,
        status: "PENDING",
      });

      await controller.requestSpecialty(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Solicitud de especialidad enviada",
        data: expect.objectContaining({ professionalId: 10, specialtyId: 5 }),
      });
    });

    it("pasa los errores de dominio al middleware mediante AppError con status esperado (P2 - Finding 4)", async () => {
      req = { user: { id: 1 } as any, params: { specialtyId: "5" } };
      mockProfilePort.findProfileIdByUserId.mockResolvedValueOnce(10);
      mockRequestUseCase.execute.mockRejectedValueOnce(
        new MaxPendingSpecialtiesExceededError()
      );

      await controller.requestSpecialty(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: "No puedes solicitar más de 2 especialidades pendientes",
        })
      );
    });

    it("mapea ProfessionalSpecialtyAlreadyExistsError a HTTP 409 (P2 - Finding 1)", async () => {
      req = { user: { id: 1 } as any, params: { specialtyId: "5" } };
      mockProfilePort.findProfileIdByUserId.mockResolvedValueOnce(10);
      mockRequestUseCase.execute.mockRejectedValueOnce(
        new ProfessionalSpecialtyAlreadyExistsError()
      );

      await controller.requestSpecialty(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: "El profesional ya solicitó esta especialidad",
        })
      );
    });

    it("propaga errores inesperados del sistema (ej. fallo de BD) a next sin enmascararlos como 400 (P2 - Finding 4)", async () => {
      req = { user: { id: 1 } as any, params: { specialtyId: "5" } };
      mockProfilePort.findProfileIdByUserId.mockResolvedValueOnce(10);
      const dbError = new Error("Connection terminated unexpectedly");
      mockRequestUseCase.execute.mockRejectedValueOnce(dbError);

      await controller.requestSpecialty(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("setStatus", () => {
    it("devuelve 400 si los IDs son inválidos", async () => {
      req = {
        params: { professionalId: "abc", specialtyId: "1" },
        body: { status: "APPROVED" },
      };

      await controller.setStatus(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "IDs inválidos" });
    });

    it("devuelve 200 con mensaje cuando el admin actualiza el estado exitosamente", async () => {
      req = {
        params: { professionalId: "10", specialtyId: "2" },
        body: { status: "APPROVED" },
      };
      mockReviewUseCase.execute.mockResolvedValueOnce({ success: true });

      await controller.setStatus(req as Request, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith({
        message: "Estado de especialidad actualizado",
        data: { success: true },
      });
    });

    it("pasa ProfessionalSpecialtyNotFoundError como 404 a next", async () => {
      req = {
        params: { professionalId: "10", specialtyId: "2" },
        body: { status: "REJECTED" },
      };
      mockReviewUseCase.execute.mockRejectedValueOnce(
        new ProfessionalSpecialtyNotFoundError()
      );

      await controller.setStatus(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: "La especialidad no está asignada al profesional",
        })
      );
    });

    it("pasa InvalidSpecialtyTransitionError como 400 a next", async () => {
      req = {
        params: { professionalId: "10", specialtyId: "2" },
        body: { status: "APPROVED" },
      };
      mockReviewUseCase.execute.mockRejectedValueOnce(
        new InvalidSpecialtyTransitionError(
          "No se puede modificar una especialidad en estado terminal REJECTED"
        )
      );

      await controller.setStatus(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: "No se puede modificar una especialidad en estado terminal REJECTED",
        })
      );
    });

    it("propaga errores inesperados de infraestructura (ej. timeout de lock) a next (P2 - Finding 4)", async () => {
      req = {
        params: { professionalId: "10", specialtyId: "2" },
        body: { status: "REJECTED" },
      };
      const lockTimeoutError = new Error("Lock timeout on PostgreSQL table");
      mockReviewUseCase.execute.mockRejectedValueOnce(lockTimeoutError);

      await controller.setStatus(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(lockTimeoutError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
