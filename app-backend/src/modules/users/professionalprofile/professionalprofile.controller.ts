// src/modules/users/professionalprofile/professionalprofile.controller.ts
import { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import { ProfessionalProfileService } from "./professionalprofile.service";
import {
  CreateCertificateSchema,
  CreateSocialLinkSchema,
  GetProfessionalProfileParamsSchema,
  SocialLinkParamsSchema,
  UpdateSocialLinkSchema,
} from "./professionalprofile.dto";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";
import { GetPublicProfessionalProfileUseCase } from "@/modules/profiles/application/use-cases/get-public-professional-profile.use-case";
import { ListPublicProfessionalProfilesUseCase } from "@/modules/profiles/application/use-cases/list-public-professional-profiles.use-case";
import { GetCertificateFileUseCase } from "@/modules/profiles/application/use-cases/get-certificate-file.use-case";
import { mapProfileErrorToHttp } from "@/modules/profiles/http/profile-error-mapper";
import {
  validateUploadedFileContent,
  InvalidFileContentError,
  MimeTypeMismatchError,
  normalizeMimeType,
} from "@/core/storage/upload";

const professionalProfileRepo = new PrismaProfessionalProfileRepository();
const getPublicProfessionalProfileUseCase =
  new GetPublicProfessionalProfileUseCase(professionalProfileRepo);
const listPublicProfessionalProfilesUseCase =
  new ListPublicProfessionalProfilesUseCase(professionalProfileRepo);
const getCertificateFileUseCase = new GetCertificateFileUseCase();

export class ProfessionalProfileController {
  // obtener perfil profesional público por ID
  static async getPublic(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = GetProfessionalProfileParamsSchema.parse(req.params);

      const profile = await getPublicProfessionalProfileUseCase.execute(
        Number(id),
        res.locals.tenantId as number,
      );

      if (!profile) {
        return res.status(404).json({
          message: "Perfil profesional no encontrado",
        });
      }

      return res.json(profile);
    } catch (err) {
      next(mapProfileErrorToHttp(err));
    }
  }

  static async getAllPublic(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const profiles = await listPublicProfessionalProfilesUseCase.execute(
        res.locals.tenantId as number,
      );

      return res.json(profiles);
    } catch (err) {
      next(mapProfileErrorToHttp(err));
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
  static async uploadCertificate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "Archivo requerido" });
      }

      const allowedCertificateMimes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "application/pdf",
      ];

      if (file.path) {
        try {
          const detectedMime = await validateUploadedFileContent(
            file.path,
            allowedCertificateMimes
          );
          if (
            normalizeMimeType(detectedMime) !== normalizeMimeType(file.mimetype)
          ) {
            throw new MimeTypeMismatchError();
          }
        } catch (err) {
          if (fs.existsSync(file.path)) {
            try {
              await fs.promises.unlink(file.path);
            } catch (unlinkErr) {
              console.error(
                "Fallo observable al limpiar archivo de certificado tras error de validación de contenido:",
                {
                  path: file.path,
                  error: unlinkErr,
                }
              );
            }
          }
          if (
            err instanceof InvalidFileContentError ||
            err instanceof MimeTypeMismatchError
          ) {
            return res.status(400).json({ message: err.message });
          }
          console.error("Error operativo al validar archivo de certificado:", err);
          return next(err);
        }
      }

      let data;
      try {
        data = CreateCertificateSchema.parse(req.body);
      } catch (parseErr) {
        if (file.path && fs.existsSync(file.path)) {
          try {
            await fs.promises.unlink(file.path);
          } catch (unlinkErr) {
            console.error(
              "Fallo observable al limpiar archivo de certificado tras error de validación de datos:",
              {
                path: file.path,
                error: unlinkErr,
              }
            );
          }
        }
        throw parseErr;
      }

      let certificate;
      try {
        certificate = await ProfessionalProfileService.createCertificate(
          req.user!.id,
          {
            ...data,
            fileUrl: `/certificates/${file.filename}`,
          }
        );
      } catch (persistErr) {
        if (file.path && fs.existsSync(file.path)) {
          try {
            await fs.promises.unlink(file.path);
          } catch (unlinkErr) {
            console.error(
              "Fallo observable al limpiar archivo de certificado tras error de persistencia:",
              {
                path: file.path,
                error: unlinkErr,
              }
            );
          }
        }
        throw persistErr;
      }

      res.json(certificate);
    } catch (err) {
      next(mapProfileErrorToHttp(err));
    }
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
      next(mapProfileErrorToHttp(err));
    }
  }

  // Descargar certificado de forma autenticada y verificando propiedad (Fase 4 D6)
  static async downloadCertificate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = SocialLinkParamsSchema.parse(req.params);

      const { filePath, fileName } = await getCertificateFileUseCase.execute(
        req.user!.id,
        Number(id),
      );

      res.download(filePath, fileName);
    } catch (err) {
      next(mapProfileErrorToHttp(err));
    }
  }
}
