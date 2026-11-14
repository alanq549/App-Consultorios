/// ARCHIVO: src/modules/catalog/http/professional-specialty.controller.ts
/// Controlador HTTP de Catalog para la gestión de elegibilidad profesional (ProfessionalSpecialty).

import { Request, Response, NextFunction } from "express";
import { RequestProfessionalSpecialtyUseCase } from "../application/use-cases/request-professional-specialty.use-case";
import { ReviewProfessionalSpecialtyUseCase } from "../application/use-cases/review-professional-specialty.use-case";
import { ProfessionalProfilePort } from "../application/ports/professional-profile-lookup.port";
import { ProfessionalSpecialtyStatus } from "../domain/professional-specialty.entity";
import { CatalogDomainError } from "../domain/catalog-errors";
import { mapCatalogErrorToHttp } from "./catalog-error-mapper";
import { AppError } from "@/shared/errors/AppError";

export class ProfessionalSpecialtyController {
  constructor(
    private readonly requestSpecialtyUseCase: RequestProfessionalSpecialtyUseCase,
    private readonly reviewSpecialtyUseCase: ReviewProfessionalSpecialtyUseCase,
    private readonly profileLookup: ProfessionalProfilePort
  ) {}

  requestSpecialty = async (
    req: Request,
    res: Response,
    next?: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Usuario no autenticado",
        });
      }

      const specialtyId = Number(req.params.specialtyId);
      if (isNaN(specialtyId)) {
        return res.status(400).json({
          message: "specialtyId inválido",
        });
      }

      const professionalProfileId =
        await this.profileLookup.findProfileIdByUserId(req.user.id);

      if (!professionalProfileId) {
        return res.status(404).json({
          message: "Perfil profesional no encontrado",
        });
      }

      const result = await this.requestSpecialtyUseCase.execute({
        professionalId: professionalProfileId,
        specialtyId,
      });

      return res.status(201).json({
        message: "Solicitud de especialidad enviada",
        data: result,
      });
    } catch (error: any) {
      if (error instanceof CatalogDomainError) {
        const httpError = mapCatalogErrorToHttp(error) as AppError;
        if (next) {
          return next(httpError);
        }
        return res.status(httpError.statusCode).json({ message: httpError.message });
      }

      // Propagar errores inesperados (P2 - Finding 4) al middleware estándar de errores
      if (next) {
        return next(error);
      }
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  setStatus = async (
    req: Request,
    res: Response,
    next?: NextFunction
  ) => {
    try {
      const professionalId = Number(req.params.professionalId);
      const specialtyId = Number(req.params.specialtyId);
      const { status } = req.body;

      if (isNaN(professionalId) || isNaN(specialtyId)) {
        return res.status(400).json({
          message: "IDs inválidos",
        });
      }

      const result = await this.reviewSpecialtyUseCase.execute({
        professionalId,
        specialtyId,
        status: status as ProfessionalSpecialtyStatus,
      });

      return res.json({
        message: "Estado de especialidad actualizado",
        data: result,
      });
    } catch (error: any) {
      if (error instanceof CatalogDomainError) {
        const httpError = mapCatalogErrorToHttp(error) as AppError;
        if (next) {
          return next(httpError);
        }
        return res.status(httpError.statusCode).json({ message: httpError.message });
      }

      // Propagar errores inesperados al middleware estándar de errores
      if (next) {
        return next(error);
      }
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  };
}
