/// ARCHIVO: src/modules/catalog/http/specialty.controller.ts
/// Controlador HTTP puro para la administración de la taxonomía Specialty en Catalog.
/// Desacoplado de infraestructura: recibe los casos de uso por inyección de dependencias.

import { Request, Response } from "express";
import {
  CreateSpecialtySchema,
  UpdateSpecialtySchema,
} from "../application/dto/specialty.dto";
import { CreateSpecialtyUseCase } from "../application/use-cases/create-specialty.use-case";
import { ListActiveSpecialtiesUseCase } from "../application/use-cases/list-active-specialties.use-case";
import { ListInactiveSpecialtiesUseCase } from "../application/use-cases/list-inactive-specialties.use-case";
import { UpdateSpecialtyUseCase } from "../application/use-cases/update-specialty.use-case";
import { DeactivateSpecialtyUseCase } from "../application/use-cases/deactivate-specialty.use-case";
import { RestoreSpecialtyUseCase } from "../application/use-cases/restore-specialty.use-case";
import { ListProfessionalPublicSpecialtiesUseCase } from "../application/use-cases/list-professional-public-specialties.use-case";
import { mapCatalogErrorToHttp } from "./catalog-error-mapper";

export interface SpecialtyControllerDependencies {
  createSpecialtyUseCase: CreateSpecialtyUseCase;
  listActiveSpecialtiesUseCase: ListActiveSpecialtiesUseCase;
  listInactiveSpecialtiesUseCase: ListInactiveSpecialtiesUseCase;
  updateSpecialtyUseCase: UpdateSpecialtyUseCase;
  deactivateSpecialtyUseCase: DeactivateSpecialtyUseCase;
  restoreSpecialtyUseCase: RestoreSpecialtyUseCase;
  listProfessionalPublicSpecialtiesUseCase: ListProfessionalPublicSpecialtiesUseCase;
}

export class SpecialtyController {
  constructor(private readonly deps: SpecialtyControllerDependencies) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = CreateSpecialtySchema.parse(req.body);
      const specialty = await this.deps.createSpecialtyUseCase.execute(data);
      res.status(201).json(specialty);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const specialties =
        await this.deps.listActiveSpecialtiesUseCase.execute();
      res.json(specialties);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  list_soft_delete = async (_req: Request, res: Response): Promise<void> => {
    try {
      const specialties =
        await this.deps.listInactiveSpecialtiesUseCase.execute();
      res.status(200).json(specialties);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const data = UpdateSpecialtySchema.parse(req.body);
      const specialty = await this.deps.updateSpecialtyUseCase.execute(id, data);
      res.json(specialty);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  restore = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const specialty = await this.deps.restoreSpecialtyUseCase.execute(id);
      res.json(specialty);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      await this.deps.deactivateSpecialtyUseCase.execute(id);
      res.status(204).send();
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  listByProfessional = async (req: Request, res: Response): Promise<void> => {
    try {
      const profileId = Number(req.params.profileId);
      const tenantId = res.locals.tenantId as number;

      const specialties =
        await this.deps.listProfessionalPublicSpecialtiesUseCase.execute({
          profileId,
          tenantId,
        });

      if (specialties === null) {
        res.status(404).json({
          message: "Perfil profesional no encontrado",
        });
        return;
      }

      res.json(specialties);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };
}
