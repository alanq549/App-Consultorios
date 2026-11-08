// src/modules/users/users.controller.ts
import { NextFunction, Request, Response } from "express";
import { ChangeEmailDTO, ChangePasswordDTO } from "./users.dto";
import { UpdateClientProfileSchema } from "./clientprofile/clientprofile.dto";
import { UpdateProfessionalProfileSchema } from "./professionalprofile/professionalprofile.dto";

// Casos de uso de Identity (Fase 2)
import { ChangePasswordUseCase } from "@/modules/identity/application/use-cases/change-password.use-case";
import { PrismaPasswordChangeRepository } from "@/modules/identity/infrastructure/prisma/prisma-password-change-repository";
import { ChangeEmailUseCase } from "@/modules/identity/application/use-cases/change-email-use-case";
import { PrismaUserAccountRepository } from "@/modules/identity/infrastructure/prisma/prisma-user-account-repository";
import { BcryptPasswordHasher } from "@/modules/identity/infrastructure/bcrypt-password-hasher";
import { NodemailerVerificationMailer } from "@/modules/identity/infrastructure/mail/nodemailer-verification-mailer";
import { PrismaChangeEmailRepository } from "@/modules/identity/infrastructure/prisma/prisma-change-email-repository";

// Casos de uso e infraestructura de Profiles (Fase 4)
import { GetCurrentUserUseCase } from "@/modules/profiles/application/use-cases/get-current-user.use-case";
import { UpdateClientProfileUseCase } from "@/modules/profiles/application/use-cases/update-client-profile.use-case";
import { UpdateProfessionalProfileUseCase } from "@/modules/profiles/application/use-cases/update-professional-profile.use-case";
import fs from "node:fs";
import {
  validateUploadedFileContent,
  validateFileMagicBytes,
  InvalidFileContentError,
  MimeTypeMismatchError,
  normalizeMimeType,
} from "@/core/storage/upload";
import { UpdateAvatarUseCase } from "@/modules/profiles/application/use-cases/update-avatar.use-case";
import { PrismaUserIdentityReader } from "@/modules/profiles/infrastructure/prisma/prisma-user-identity-reader";
import { PrismaClientProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-client-profile-repository";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";
import { PrismaAdminProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-admin-profile-repository";
import { PrismaUserConfigReader } from "@/modules/profiles/infrastructure/prisma/prisma-user-config-reader";
import { LocalStorageAdapter } from "@/modules/profiles/infrastructure/storage/local-storage.adapter";
import { mapProfileErrorToHttp } from "@/modules/profiles/http/profile-error-mapper";

// Errores de Dominio
import {
  InvalidCurrentPasswordError,
  UserAccountNotFoundError,
  EmailAlreadyInUseError,
} from "@/modules/identity/domain/identity-errors";
import { AppError } from "@/shared/errors/AppError";

// Instancias de casos de uso de Identity
const changePasswordUseCase = new ChangePasswordUseCase(
  new PrismaUserAccountRepository(),
  new BcryptPasswordHasher(),
  new PrismaPasswordChangeRepository()
);

const changeEmailUseCase = new ChangeEmailUseCase(
  new PrismaUserAccountRepository(),
  new BcryptPasswordHasher(),
  new PrismaChangeEmailRepository(),
  new NodemailerVerificationMailer()
);

// Instancias de casos de uso de Profiles (Fase 4)
const identityReader = new PrismaUserIdentityReader();
const clientProfileRepo = new PrismaClientProfileRepository();
const professionalProfileRepo = new PrismaProfessionalProfileRepository();
const adminProfileRepo = new PrismaAdminProfileRepository();
const configReader = new PrismaUserConfigReader();
const storageAdapter = new LocalStorageAdapter();

const getCurrentUserUseCase = new GetCurrentUserUseCase(
  identityReader,
  clientProfileRepo,
  professionalProfileRepo,
  adminProfileRepo,
  configReader
);

const updateClientProfileUseCase = new UpdateClientProfileUseCase(
  clientProfileRepo
);

const updateProfessionalProfileUseCase = new UpdateProfessionalProfileUseCase(
  professionalProfileRepo
);

const updateAvatarUseCase = new UpdateAvatarUseCase(
  clientProfileRepo,
  professionalProfileRepo,
  adminProfileRepo,
  storageAdapter
);

export class UsersController {
  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await getCurrentUserUseCase.execute({
        userId: req.user!.id,
        role: req.user!.role,
      });
      return res.json(data);
    } catch (error) {
      return next(mapProfileErrorToHttp(error));
    }
  }

  static async changeEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = ChangeEmailDTO.parse(req.body);

      const result = await changeEmailUseCase.execute({
        userId: req.user!.id,
        currentPassword: password,
        newEmail: email,
      });

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidCurrentPasswordError) {
        return next(new AppError(error.message, 400));
      }

      if (error instanceof EmailAlreadyInUseError) {
        return next(new AppError(error.message, 409));
      }

      if (error instanceof UserAccountNotFoundError) {
        return next(new AppError(error.message, 404));
      }

      return next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = ChangePasswordDTO.parse(
        req.body
      );

      const result = await changePasswordUseCase.execute({
        userId: req.user!.id,
        currentPassword,
        newPassword,
      });

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidCurrentPasswordError) {
        return next(new AppError(error.message, 400));
      }

      if (error instanceof UserAccountNotFoundError) {
        return next(new AppError(error.message, 404));
      }

      return next(error);
    }
  }

  static async updateAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validar contenido real (magic bytes) y correspondencia con el MIME declarado
      const allowedImageMimes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ];

      let detectedMime: string;

      try {
        if (req.file.path) {
          detectedMime = await validateUploadedFileContent(
            req.file.path,
            allowedImageMimes
          );
        } else if (req.file.buffer) {
          const mime = validateFileMagicBytes(req.file.buffer, allowedImageMimes);
          if (!mime) {
            throw new InvalidFileContentError();
          }
          detectedMime = mime;
        } else {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Comparar el MIME detectado con el MIME declarado normalizando alias (image/jpg -> image/jpeg)
        if (
          normalizeMimeType(detectedMime) !== normalizeMimeType(req.file.mimetype)
        ) {
          throw new MimeTypeMismatchError();
        }
      } catch (err) {
        // Limpieza del archivo temporal en disco si existe
        if (req.file.path && fs.existsSync(req.file.path)) {
          try {
            await fs.promises.unlink(req.file.path);
          } catch (unlinkErr) {
            console.error(
              "Fallo observable al limpiar archivo temporal tras error de validación:",
              {
                path: req.file.path,
                error: unlinkErr,
              }
            );
          }
        }

        // Si es un error de formato o discrepancia de MIME, responder 400 Bad Request
        if (
          err instanceof InvalidFileContentError ||
          err instanceof MimeTypeMismatchError
        ) {
          return res.status(400).json({ message: err.message });
        }

        // Si es un fallo operativo de filesystem (EIO, permisos, etc.), registrar y propagar como 500
        console.error(
          "Error operativo de filesystem al leer o validar el archivo subido:",
          {
            path: req.file.path,
            error: err,
          }
        );
        return next(err);
      }

      const avatarPath = `/avatars/${req.file.filename}`;

      const updated = await updateAvatarUseCase.execute({
        userId: req.user!.id,
        role: req.user!.role,
        newAvatar: avatarPath,
      });

      return res.json({ avatar: updated.avatar });
    } catch (error) {
      return next(mapProfileErrorToHttp(error));
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      let profile;

      switch (req.user!.role) {
        case "CLIENT": {
          const data = UpdateClientProfileSchema.parse(req.body);
          profile = await updateClientProfileUseCase.execute(
            req.user!.id,
            data
          );
          break;
        }

        case "PROFESSIONAL": {
          const data = UpdateProfessionalProfileSchema.parse(req.body);
          profile = await updateProfessionalProfileUseCase.execute(
            req.user!.id,
            {
              name: data.name,
              lastName: data.lastName,
              phone: data.phone,
            }
          );
          break;
        }

        default:
          return next(new AppError("Rol no soportado", 400));
      }

      return res.json(profile);
    } catch (error) {
      return next(mapProfileErrorToHttp(error));
    }
  }
}
