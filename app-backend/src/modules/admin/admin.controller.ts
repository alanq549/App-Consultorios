// src/modules/admin/admin.controller.ts
import { Request, Response } from "express";
import { ProfessionalProfileService } from "@/modules/users/professionalprofile/professionalprofile.service";

export class AdminController {
  static async reviewProfessionalProfile(req: Request, res: Response) {
    try {
      const profileId = Number(req.params.profileId);
      const { status } = req.body;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({
          message: "Status inválido",
        });
      }

      const result = await ProfessionalProfileService.reviewProfile(
        profileId,
        status,
      );

      res.json({
        message: "Perfil revisado correctamente",
        profile: result,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error al revisar perfil",
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  static async getPendingProfiles(req: Request, res: Response) {
    try {
      const profiles = await ProfessionalProfileService.getPendingProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener perfiles pendientes",
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  static async getAllProfiles(req: Request, res: Response) {
  try {
    const profiles = await ProfessionalProfileService.getAllProfiles();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener perfiles",
      error: error instanceof Error ? error.message : error,
    });
  }
}

  static async setProfileStatus(req: Request, res: Response) {
    try {
      const profileId = Number(req.params.profileId);
      const { status } = req.body;
      if (!["APPROVED", "SUSPENDED"].includes(status)) {
        return res.status(400).json({
          message: "Status inválido",
        });
      }
      const result = await ProfessionalProfileService.setProfileStatus(
        profileId,
        status,
      );
      res.json({
        message: "Estado del perfil actualizado correctamente",
        profile: result,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error al actualizar estado del perfil",
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
