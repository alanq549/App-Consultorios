import { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  RegisterDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
} from "./auth.dto";
import { AppError } from "@/core/errors/AppError";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RegisterDTO.parseAsync(req.body);
      const user = await AuthService.register(data);
      res.status(201).json(user);
    } catch (err) {
      next(err); // 👈 esto manda el error a tu errorHandler
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await LoginDTO.parseAsync(req.body);
      const result = await AuthService.login(data.email, data.password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async verifyByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        throw new AppError("Token requerido", 400);
      }
      const result = await AuthService.verifyByToken(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError("Refresh token requerido", 400);
      }
      const result = await AuthService.refresh(refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ForgotPasswordDTO.parseAsync(req.body);
      await AuthService.forgotPassword(data.email);
      res.json({ message: "Si existe el usuario, se envió el correo" });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ResetPasswordDTO.parseAsync(req.body);
      await AuthService.resetPassword(data.token, data.newPassword);
      res.json({ message: "Password actualizada" });
    } catch (err) {
      next(err);
    }
  }
}
