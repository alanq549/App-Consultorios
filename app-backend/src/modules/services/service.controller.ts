// src/modules/service/service.controller.ts
import { Request, Response, NextFunction } from "express";
import { ServiceService } from "./service.service";
import { CreateServiceSchema, UpdateServiceSchema } from "./service.dto";

export class ServiceController {
  static async create(req: Request, res: Response, next: NextFunction) {
      console.log("🔥 ENTRO AL CONTROLLER");
    try {
      const profileId = await ServiceService.getProfileIdByUser(req.user!.id);

      const data = CreateServiceSchema.parse(req.body);

      const service = await ServiceService.create(profileId, data);

      res.status(201).json(service);
    } catch (err) {
      next(err);
    }
  }

  static async listByProfessional(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const profileId = Number(req.params.profileId);
      const services = await ServiceService.findByProfessional(profileId);

      res.json(services);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = UpdateServiceSchema.parse(req.body);
      const profileId = await ServiceService.getProfileIdByUser(req.user!.id);

      const service = await ServiceService.update(id, profileId, data);

      res.json(service);
    } catch (err) {
      next(err);
    }
  }

static async remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);

    const profileId = await ServiceService.getProfileIdByUser(req.user!.id);

    await ServiceService.remove(id, profileId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
}
