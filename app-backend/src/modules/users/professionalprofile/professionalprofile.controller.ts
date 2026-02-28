// src/modules/users/professionalprofile/professionalprofile.controller.ts
import { Request, Response, NextFunction } from "express";
import { ProfessionalProfileService } from "./professionalprofile.service";
import { GetProfessionalProfileParamsSchema } from "./professionalprofile.dto";

export class ProfessionalProfileController {
  // obtener perfil profesional público por ID
  static async getPublic(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = GetProfessionalProfileParamsSchema.parse(req.params);

      const profile = await ProfessionalProfileService.getPublicById(
        Number(id)
      );

      if (!profile) {
        return res.status(404).json({
          message: "Perfil profesional no encontrado",
        });
      }

      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

   static async getAllPublic(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const profiles = await ProfessionalProfileService.getAllPublic();
      res.json(profiles);
    } catch (err) {
      next(err);
    }
  }
  
}
