/// ARCHIVO: src/modules/identity/infrastructure/jwt-access-token-service.ts
/// Implementación de AccessTokenService utilizando la librería JSON Web Token (JWT).

import jwt from "jsonwebtoken";
import { AccessTokenService } from "../application/ports/access-token-service";
import { ActorContext } from "@/shared/types/actor-context";
import { AppError } from "@/shared/errors/AppError";

export class JwtAccessTokenService implements AccessTokenService {
  private readonly secret: string;
  private readonly expiresIn: number;

  constructor() {
    const secret = process.env.JWT_SECRET;

    // Lanza un error al inicializar si falta la clave secreta en las variables de entorno
    if (!secret) {
      throw new Error("JWT_SECRET no está configurado");
    }

    this.secret = secret;
    this.expiresIn = 7 * 24 * 60 * 60; // Tiempo de expiración: 7 días (en segundos)
  }

  /// Genera un token JWT firmado codificando el userId y rol del actor.
  sign(actor: ActorContext): string {
    return jwt.sign(
      {
        userId: actor.id,
        role: actor.role,
      },
      this.secret,
      {
        expiresIn: this.expiresIn,
      }
    );
  }

  /// Decodifica, valida la firma y verifica que la estructura interna del token sea válida.
  verify(token: string): ActorContext {
    try {
      const decoded = jwt.verify(token, this.secret) as {
        userId: unknown;
        role: unknown;
      };

      // Valida que el payload contenga un userId numérico válido y un rol autorizado
      if (
        typeof decoded.userId !== "number" ||
        !Number.isInteger(decoded.userId) ||
        decoded.userId <= 0 ||
        !["ADMIN", "PROFESSIONAL", "CLIENT"].includes(decoded.role as string)
      ) {
        throw new AppError("Invalid token payload structure", 401);
      }

      return {
        id: decoded.userId,
        role: decoded.role as "ADMIN" | "PROFESSIONAL" | "CLIENT",
      };
    } catch (error) {
      // Re-lanza errores de aplicación conocidos (como fallo en la estructura)
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid or expired token", 401);
    }
  }
}