/// ARCHIVO: src/modules/identity/http/identity.controller.ts
/// Controlador HTTP para el módulo de identidad. Instancia las dependencias y maneja las peticiones de autenticación y verificación.

import type { NextFunction, Request, Response } from "express";
import { LoginDTO, VerifyEmailDTO } from "./identity.dto";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { VerifyEmailUseCase } from "../application/use-cases/verify-email.use-case";
import { PrismaUserAccountRepository } from "../infrastructure/prisma/prisma-user-account-repository";
import { BcryptPasswordHasher } from "@/modules/identity/infrastructure/bcrypt-password-hasher";
import { JwtAccessTokenService } from "../infrastructure/jwt-access-token-service";
import { PrismaSessionRepository } from "../infrastructure/prisma/prisma-session-repository";
import { PrismaVerificationRepository } from "../infrastructure/prisma/prisma-verification-repository";

// Instanciación de los casos de uso inyectando sus respectivas implementaciones de infraestructura
const loginUseCase = new LoginUseCase(
  new PrismaUserAccountRepository(),
  new BcryptPasswordHasher(),
  new JwtAccessTokenService(),
  new PrismaSessionRepository()
);

const verifyEmailUseCase = new VerifyEmailUseCase(
  new PrismaVerificationRepository(),
  new JwtAccessTokenService(),
  new PrismaSessionRepository()
);

export class IdentityController {
  /// Procesa la solicitud de inicio de sesión: valida los datos recibidos, ejecuta el login y retorna los tokens.
  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Valida la estructura del body enviado por el cliente según el esquema DTO (Zod)
      const data = await LoginDTO.parseAsync(req.body);

      // Ejecuta la lógica del caso de uso de inicio de sesión
      const result = await loginUseCase.execute(data);

      return res.status(200).json(result);
    } catch (error) {
      // Transfiere cualquier error al middleware global de manejo de errores
      return next(error);
    }
  }

  /// Procesa la verificación de correo electrónico: valida el token recibido por query, ejecuta la verificación y retorna la sesión iniciada.
  static async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Valida que el parámetro token recibido en la URL (query) cumpla con el esquema DTO
      const data = VerifyEmailDTO.parse({
        token: req.query.token,
      });

      // Ejecuta el caso de uso para consumar la verificación y generar tokens
      const result = await verifyEmailUseCase.execute(data);

      return res.status(200).json(result);
    } catch (error) {
      // Transfiere cualquier error al middleware global de manejo de errores
      return next(error);
    }
  }
}