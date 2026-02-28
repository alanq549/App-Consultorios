// src/modules/service/service.controller.ts
import { Request, Response, NextFunction } from "express";
import { ServiceService } from "./service.service";
import {
  CreateServiceSchema,
  UpdateServiceSchema,
} from "./service.dto";
import prisma from "@/core/prisma";

export class ServiceController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      // 1️⃣ Obtener el professionalProfile real
      const professionalProfile = await prisma.professionalProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!professionalProfile) {
        throw new Error("Perfil profesional no existe");
      }

      // 2️⃣ Validar datos
      const data = CreateServiceSchema.parse(req.body);

      // 3️⃣ Crear servicio
      const service = await ServiceService.create(
        professionalProfile.id,
        data
      );

      res.status(201).json(service);
    } catch (err) {
      next(err);
    }
  }

  static async listByProfessional(
    req: Request,
    res: Response,
    next: NextFunction
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
      const professionalProfile = await prisma.professionalProfile.findUnique({
  where: { userId: req.user!.id },
});


const service = await ServiceService.update(
  id,
  professionalProfile!.id,
  data
);      res.json(service);
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const professionalProfile = await prisma.professionalProfile.findUnique({
  where: { userId: req.user!.id },
});
      await ServiceService.remove(id, professionalProfile!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
