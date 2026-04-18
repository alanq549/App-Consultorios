// src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts

import { Request, Response } from "express";
import { ProfessionalSpecialtyService } from "./ProfessionalSpecialty.Service";
import prisma from "@/core/prisma";

export class ProfessionalSpecialtyController {
  // profesional solicita una especialidad
  static async requestSpecialty(req: Request, res: Response) {
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

    // 🔥 FIX IMPORTANTE: resolver ProfessionalProfile
    const professional = await prisma.professionalProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!professional) {
      return res.status(404).json({
        message: "Perfil profesional no encontrado",
      });
    }

    const result = await ProfessionalSpecialtyService.requestSpecialty(
      professional.id, // 👈 CORRECTO
      specialtyId
    );

    return res.status(201).json({
      message: "Solicitud de especialidad enviada",
      data: result,
    });

  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "Error solicitando especialidad",
    });
  }
}

  // admin aprueba / rechaza
  static async setStatus(req: Request, res: Response) {
    try {
      const professionalId = Number(req.params.professionalId);
      const specialtyId = Number(req.params.specialtyId);
      const { status } = req.body;

      if (isNaN(professionalId) || isNaN(specialtyId)) {
        return res.status(400).json({
          message: "IDs inválidos",
        });
      }

      const result = await ProfessionalSpecialtyService.setSpecialtyStatus(
        professionalId,
        specialtyId,
        status,
      );

      return res.json({
        message: "Estado de especialidad actualizado",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Error actualizando estado",
      });
    }
  }
}
