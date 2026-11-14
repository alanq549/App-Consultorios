/// ARCHIVO: src/modules/catalog/http/service-offer.controller.ts
/// Controlador HTTP de ofertas reservables (Catalog, Misión 4).
/// Recibe los casos de uso por inyección de dependencias y traduce errores de dominio a HTTP.

import { Request, Response } from "express";
import {
  CreateServiceOfferSchema,
  UpdateServiceOfferSchema,
} from "../application/dto/service-offer.dto";
import { CreateServiceOfferUseCase } from "../application/use-cases/create-service-offer.use-case";
import { UpdateServiceOfferUseCase } from "../application/use-cases/update-service-offer.use-case";
import { DeactivateServiceOfferUseCase } from "../application/use-cases/deactivate-service-offer.use-case";
import { ListProfessionalPublicOffersUseCase } from "../application/use-cases/list-professional-public-offers.use-case";
import { mapCatalogErrorToHttp } from "./catalog-error-mapper";

export interface ServiceOfferControllerDependencies {
  createServiceOfferUseCase: CreateServiceOfferUseCase;
  updateServiceOfferUseCase: UpdateServiceOfferUseCase;
  deactivateServiceOfferUseCase: DeactivateServiceOfferUseCase;
  listProfessionalPublicOffersUseCase: ListProfessionalPublicOffersUseCase;
}

export class ServiceOfferController {
  constructor(private readonly deps: ServiceOfferControllerDependencies) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = CreateServiceOfferSchema.parse(req.body);
      const tenantId = res.locals.tenantId as number;
      const offer = await this.deps.createServiceOfferUseCase.execute({
        userId: req.user!.id,
        tenantId,
        data,
      });
      res.status(201).json(offer);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const offerId = Number(req.params.id);
      const data = UpdateServiceOfferSchema.parse(req.body);
      const tenantId = res.locals.tenantId as number;
      const offer = await this.deps.updateServiceOfferUseCase.execute({
        userId: req.user!.id,
        tenantId,
        offerId,
        data,
      });
      res.json(offer);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const offerId = Number(req.params.id);
      const tenantId = res.locals.tenantId as number;
      await this.deps.deactivateServiceOfferUseCase.execute({
        userId: req.user!.id,
        tenantId,
        offerId,
      });
      res.status(204).send();
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };

  listByProfessional = async (req: Request, res: Response): Promise<void> => {
    try {
      const profileId = Number(req.params.profileId);
      const tenantId = res.locals.tenantId as number;

      const offers = await this.deps.listProfessionalPublicOffersUseCase.execute({
        profileId,
        tenantId,
      });

      if (offers === null) {
        res.status(404).json({ message: "Perfil profesional no encontrado" });
        return;
      }

      res.json(offers);
    } catch (err) {
      throw mapCatalogErrorToHttp(err);
    }
  };
}
