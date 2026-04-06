// src/modules/users/users.controller.ts
import { Request, Response } from "express";
import { UsersService } from "./users.service";
import { ChangeEmailDTO, ChangePasswordDTO } from "./users.dto";
import { UpdateClientProfileSchema } from "./clientprofile/clientprofile.dto";
import { UpdateProfessionalProfileSchema } from "./professionalprofile/professionalprofile.dto";
/* import { UpdateAdminProfileSchema } from "./adminprofile/adminprofile.dto"; */

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

  static async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = ChangePasswordDTO.parse(req.body);

    const result = await UsersService.changePassword(
      req.user!.id,
      currentPassword,
      newPassword,
    );

    res.json(result);
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
