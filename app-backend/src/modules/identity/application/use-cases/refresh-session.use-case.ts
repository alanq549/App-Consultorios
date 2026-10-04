/// ARCHIVO: src/modules/identity/application/use-cases/refresh-session.use-case.ts
/// Caso de uso para rotar una sesión mediante un refresh token y emitir un nuevo access token.

import crypto from "crypto";
import type { AccessTokenService } from "../ports/access-token-service";
import type { SessionRepository } from "../ports/session-repository";
import { InvalidRefreshTokenError } from "../../domain/identity-errors";

/// Parámetros de entrada requeridos para solicitar la rotación de sesión.
export interface RefreshSessionDTO {
  refreshToken: string;
}

/// Estructura del resultado que contiene el nuevo token de acceso y el nuevo refresh token rotado.
export interface RefreshSessionResultDTO {
  token: string;
  refreshToken: string;
}

export class RefreshSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly accessTokenService: AccessTokenService
  ) {}

  /// Ejecuta la validación, rotación del refresh token y la emisión del nuevo access token.
  async execute(
    data: RefreshSessionDTO
  ): Promise<RefreshSessionResultDTO> {
    // Valida que el token recibido no sea nulo o contenga solo espacios en blanco
    if (!data.refreshToken || data.refreshToken.trim() === "") {
      throw new InvalidRefreshTokenError();
    }

    // Calcula el hash SHA-256 del refresh token para su búsqueda segura en la base de datos
    const tokenHash = crypto
      .createHash("sha256")
      .update(data.refreshToken)
      .digest("hex");

    // Intenta rotar la sesión en el repositorio evaluando vigencia y estado
    const rotatedSession = await this.sessionRepository.rotateSession(
      tokenHash,
      new Date()
    );

    // Lanza un error si la sesión no existe, expiró o ya fue revocada/consumida
    if (!rotatedSession) {
      throw new InvalidRefreshTokenError();
    }

    // Genera un nuevo JWT firmado con la identidad del actor asociada a la sesión
    const token = this.accessTokenService.sign({
      id: rotatedSession.actor.id,
      role: rotatedSession.actor.role,
    });

    // Retorna el nuevo access token y el nuevo refresh token generado en la rotación
    return {
      token,
      refreshToken: rotatedSession.session.token,
    };
  }
}