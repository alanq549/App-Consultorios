/// ARCHIVO: src/modules/identity/http/identity.controller.ts
/// Controlador HTTP para el módulo de identidad. Instancia las dependencias y maneja las peticiones de autenticación, verificación y recuperación de cuenta.

import type { NextFunction, Request, Response } from "express";
import {
  ForgotPasswordDTO,
  LoginDTO,
  RefreshSessionDTO,
  ResetPasswordDTO,
  VerifyEmailDTO,
} from "./identity.dto";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { VerifyEmailUseCase } from "../application/use-cases/verify-email.use-case";
import { RefreshSessionUseCase } from "../application/use-cases/refresh-session.use-case";
import { ForgotPasswordUseCase } from "@/modules/identity/application/use-cases/forgot-password.use-case";
import { ResetPasswordUseCase } from "@/modules/identity/application/use-cases/reset-password.use-case";
import { PrismaUserAccountRepository } from "../infrastructure/prisma/prisma-user-account-repository";
import { BcryptPasswordHasher } from "@/modules/identity/infrastructure/bcrypt-password-hasher";
import { JwtAccessTokenService } from "../infrastructure/jwt-access-token-service";
import { PrismaSessionRepository } from "../infrastructure/prisma/prisma-session-repository";
import { PrismaVerificationRepository } from "../infrastructure/prisma/prisma-verification-repository";
import { PrismaPasswordResetRepository } from "@/modules/identity/infrastructure/prisma/prisma-password-reset-repository";
import { NodemailerPasswordResetMailer } from "@/modules/identity/infrastructure/mail/password-reset-mailer";
import { AppError } from "@/shared/errors/AppError";
import { InvalidPasswordResetTokenError } from "@/modules/identity/domain/identity-errors";

// Instanciación del caso de uso de inicio de sesión
const loginUseCase = new LoginUseCase(
  new PrismaUserAccountRepository(),
  new BcryptPasswordHasher(),
  new JwtAccessTokenService(),
  new PrismaSessionRepository()
);

// Instanciación del caso de uso de verificación de correo
const verifyEmailUseCase = new VerifyEmailUseCase(
  new PrismaVerificationRepository(),
  new JwtAccessTokenService(),
  new PrismaSessionRepository()
);

// Repositorio compartido para las operaciones de recuperación de contraseña
const passwordResetRepository = new PrismaPasswordResetRepository();

// Instanciación del caso de uso para solicitar el correo de recuperación
const forgotPasswordUseCase = new ForgotPasswordUseCase(
  new PrismaUserAccountRepository(),
  passwordResetRepository,
  new NodemailerPasswordResetMailer()
);

// Instanciación del caso de uso para restablecer la contraseña con el token
const resetPasswordUseCase = new ResetPasswordUseCase(
  passwordResetRepository,
  new BcryptPasswordHasher()
);

export class IdentityController {
  /// Procesa el inicio de sesión: valida las credenciales y devuelve los tokens de acceso.
  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Valida la información recibida en el cuerpo de la petición
      const data = await LoginDTO.parseAsync(req.body);

      // Ejecuta la autenticación
      const result = await loginUseCase.execute(data);

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  /// Procesa la verificación de correo a través del token enviado en la URL.
  static async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Valida el token recibido en la URL
      const data = VerifyEmailDTO.parse({
        token: req.query.token,
      });

      // Confirma la cuenta y genera la sesión
      const result = await verifyEmailUseCase.execute(data);

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  /// Renueva la sesión y entrega un nuevo token de acceso usando el refresh token.
  static async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Valida el refresh token del cuerpo de la petición
      const data = await RefreshSessionDTO.parseAsync(req.body);

      const sessionRepository = new PrismaSessionRepository();
      const accessTokenService = new JwtAccessTokenService();

      const useCase = new RefreshSessionUseCase(
        sessionRepository,
        accessTokenService
      );

      // Genera un nuevo token de acceso
      const result = await useCase.execute(data);

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  /// Recibe la solicitud de olvido de contraseña y envía el correo con el enlace si el usuario existe.
  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Valida que se haya enviado un correo con formato correcto
      const { email } = ForgotPasswordDTO.parse(req.body);

      // Genera el token y envía el correo de recuperación
      await forgotPasswordUseCase.execute(email);

      return res.status(200).json({
        message:
          "Solicitud recibida. Si la cuenta existe, recibirás instrucciones; si no llegan, vuelve a solicitar el restablecimiento.",
      });
    } catch (error) {
      return next(error);
    }
  }

  /// Recibe el token de recuperación y la nueva contraseña para actualizarla.
  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Valida el token y la nueva contraseña recibida
      const { token, newPassword } = ResetPasswordDTO.parse(req.body);

      // Actualiza la clave del usuario
      await resetPasswordUseCase.execute(token, newPassword);

      // Respuesta exitosa
      return res.status(200).json({
        message: "Password actualizada",
      });
    } catch (error) {
      // Manejo de error específico para token inválido
      if (error instanceof InvalidPasswordResetTokenError) {
        return next(new AppError(error.message, 400));
      }

      return next(error);
    }
  }
}