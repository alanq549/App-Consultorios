// src/modules/schedule/schedule.controller.ts
import { Request, Response, NextFunction } from "express";
import prisma from "@/core/prisma";
import { ScheduleService } from "./schedule.service";
import { CreateScheduleSchema, UpdateScheduleSchema } from "./schedule.dto";

export class ScheduleController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalProfile = await prisma.professionalProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!professionalProfile) {
        throw new Error("Perfil profesional no existe");
      }

      const data = CreateScheduleSchema.parse(req.body);

      const schedule = await ScheduleService.create(
        professionalProfile.id,
        data,
      );

      res.status(201).json(schedule);
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
      const schedules = await ScheduleService.findByProfessional(profileId);
      res.json(schedules);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const professionalProfile = await prisma.professionalProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!professionalProfile) {
        throw new Error("Perfil profesional no existe");
      }

      const data = UpdateScheduleSchema.parse(req.body);

      const schedule = await ScheduleService.update(
        id,
        professionalProfile.id,
        data,
      );

      res.json(schedule);
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

      if (!professionalProfile) {
        throw new Error("Perfil profesional no existe");
      }

      await ScheduleService.remove(id, professionalProfile.id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
