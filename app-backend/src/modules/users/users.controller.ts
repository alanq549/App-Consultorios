// src/modules/users/users.controller.ts
import { NextFunction, Request, Response } from "express";
import { UsersService } from "./users.service";
import { ChangeEmailDTO, ChangePasswordDTO } from "./users.dto";
import { UpdateClientProfileSchema } from "./clientprofile/clientprofile.dto";
import { UpdateProfessionalProfileSchema } from "./professionalprofile/professionalprofile.dto";

// Importaciones del caso de uso de Change Password
import { ChangePasswordUseCase } from "@/modules/identity/application/use-cases/change-password.use-case";
import { PrismaPasswordChangeRepository } from "@/modules/identity/infrastructure/prisma/prisma-password-change-repository";

// Importaciones del caso de uso de Change Email (NUEVO)
import { ChangeEmailUseCase } from "@/modules/identity/application/use-cases/change-email-use-case";
import { PrismaUserAccountRepository } from "@/modules/identity/infrastructure/prisma/prisma-user-account-repository";
import { BcryptPasswordHasher } from "@/modules/identity/infrastructure/bcrypt-password-hasher";
import { NodemailerVerificationMailer } from "@/modules/identity/infrastructure/mail/nodemailer-verification-mailer";
import { PrismaChangeEmailRepository } from "@/modules/identity/infrastructure/prisma/prisma-change-email-repository";

// Errores de Dominio
import {
  InvalidCurrentPasswordError,
  UserAccountNotFoundError,
  EmailAlreadyInUseError,
} from "@/modules/identity/domain/identity-errors";
import { AppError } from "@/shared/errors/AppError";

// Instancias de los casos de uso
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

export class UsersController {
  static async me(req: Request, res: Response) {
    const data = await UsersService.me(req.user!.id, req.user!.role);
    res.json(data);
  }

  // 👇 MÉTODO CORREGIDO Y MIGRADO A ARQUITECTURA LIMPIA
  static async changeEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = ChangeEmailDTO.parse(req.body);

      // Ahora los parámetros entran explícitamente y mapeados al Use Case
      const result = await changeEmailUseCase.execute({
        userId: req.user!.id,
        currentPassword: password, // Mapeado correctamente
        newEmail: email,          // Mapeado correctamente
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
        req.body,
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

  static async updateAvatar(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const avatarPath = `/avatars/${req.file.filename}`;

    const updated = await UsersService.updateAvatar(
      req.user!.id,
      req.user!.role,
      avatarPath,
    );

    res.json({ avatar: updated.avatar });
  }

  static async updateProfile(req: Request, res: Response) {
    let data;

    switch (req.user!.role) {
      case "CLIENT":
        data = UpdateClientProfileSchema.parse(req.body);
        break;

      case "PROFESSIONAL":
        data = UpdateProfessionalProfileSchema.parse(req.body);
        break;

      default:
        throw new Error("Rol no soportado");
    }

    const profile = await UsersService.updateProfile(
      req.user!.id,
      req.user!.role,
      data,
    );

    res.json(profile);
  }
}