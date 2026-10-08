// src/modules/users/users.controller.ts
import { NextFunction, Request, Response } from "express";
import { UsersService } from "./users.service";
import { ChangeEmailDTO, ChangePasswordDTO } from "./users.dto";
import { UpdateClientProfileSchema } from "./clientprofile/clientprofile.dto";
import { UpdateProfessionalProfileSchema } from "./professionalprofile/professionalprofile.dto";
/* import { UpdateAdminProfileSchema } from "./adminprofile/adminprofile.dto"; */

import { ChangePasswordUseCase } from "@/modules/identity/application/use-cases/change-password.use-case";
import { PrismaUserAccountRepository } from "@/modules/identity/infrastructure/prisma/prisma-user-account-repository";
import { BcryptPasswordHasher } from "@/modules/identity/infrastructure/bcrypt-password-hasher";
import { PrismaPasswordChangeRepository } from "@/modules/identity/infrastructure/prisma/prisma-password-change-repository";
import {
  InvalidCurrentPasswordError,
  UserAccountNotFoundError,
} from "@/modules/identity/domain/identity-errors";
import { AppError } from "@/shared/errors/AppError";


const changePasswordUseCase = new ChangePasswordUseCase(
  new PrismaUserAccountRepository(),
  new BcryptPasswordHasher(),
  new PrismaPasswordChangeRepository()
);

export class UsersController {
  ///
  static async me(req: Request, res: Response) {
    const data = await UsersService.me(req.user!.id, req.user!.role);
    res.json(data);
  }

  static async changeEmail(req: Request, res: Response) {
    const { email, password } = ChangeEmailDTO.parse(req.body);

    ///ahora son 3 argumentos no ?
    const result = await UsersService.changeEmail(
      req.user!.id,
      email,
      password,
    );

    res.json(result);
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

      /*  case "ADMIN":
      data = UpdateAdminProfileSchema.parse(req.body);
      break;
 */
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
