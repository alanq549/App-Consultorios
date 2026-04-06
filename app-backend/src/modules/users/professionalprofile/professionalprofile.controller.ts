// src/modules/users/professionalprofile/professionalprofile.controller.ts
import { Request, Response, NextFunction } from "express";
import { ProfessionalProfileService } from "./professionalprofile.service";
import {
  CreateCertificateSchema,
  CreateSocialLinkSchema,
  GetProfessionalProfileParamsSchema,
  SocialLinkParamsSchema,
  UpdateSocialLinkSchema,
} from "./professionalprofile.dto";

export class ProfessionalProfileController {
  // obtener perfil profesional público por ID
  static async getPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = GetProfessionalProfileParamsSchema.parse(req.params);

      const profile = await ProfessionalProfileService.getPublicById(
        Number(id),
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

  static async getAllPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const profiles = await ProfessionalProfileService.getAllPublic();
      res.json(profiles);
    } catch (err) {
      next(err);
    }
  }

  // Crear socialLinks
  static async createSocialLink(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = CreateSocialLinkSchema.parse(req.body);

      const socialLink = await ProfessionalProfileService.createSocialLink(
        req.user!.id,
        data,
      );

      res.status(201).json(socialLink);
    } catch (err) {
      next(err);
    }
  }

  // Actualizar socialLinks
  static async updateSocialLink(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = SocialLinkParamsSchema.parse(req.params);
      const data = UpdateSocialLinkSchema.parse(req.body);

      const socialLink = await ProfessionalProfileService.updateSocialLink(
        req.user!.id,
        Number(id),
        data,
      );

      res.json(socialLink);
    } catch (err) {
      next(err);
    }
  }

  // Eliminar socialLinks:
  static async deleteSocialLink(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = SocialLinkParamsSchema.parse(req.params);

      const result = await ProfessionalProfileService.deleteSocialLink(
        req.user!.id,
        Number(id),
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // Subir certificado (autenticado y con rol profesional)
  static async uploadCertificate(req: Request, res: Response) {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Archivo requerido" });
    }

    const data = CreateCertificateSchema.parse(req.body);

    const certificate = await ProfessionalProfileService.createCertificate(
      req.user!.id,
      {
        ...data,
        fileUrl: `/certificates/${file.filename}`,
      },
    );

    res.json(certificate);
  }

  // Eliminar certificado:
  static async deleteCertificate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = SocialLinkParamsSchema.parse(req.params);

      const result = await ProfessionalProfileService.deleteCertificate(
        req.user!.id,
        Number(id),
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
