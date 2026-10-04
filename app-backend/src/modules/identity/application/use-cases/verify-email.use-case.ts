/// ARCHIVO: src/modules/identity/application/use-cases/verify-email-use-case.ts
/// Caso de uso para validar la verificación de correo electrónico mediante token y crear la sesión del usuario.

import crypto from "crypto";
import type { AccessTokenService } from "../ports/access-token-service";
import type { SessionRepository } from "../ports/session-repository";
import type { VerificationRepository } from "../ports/verification-repository";
import { InvalidVerificationTokenError } from "../../domain/identity-errors";

/// Parámetros de entrada requeridos para ejecutar el caso de uso de verificación de correo.
export interface VerifyEmailDTO {
  token: string;
}

/// Estructura de respuesta devuelta tras verificar exitosamente el correo y autenticar al usuario.
export interface VerifyEmailResultDTO {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
  };
}

export class VerifyEmailUseCase {
  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly accessTokenService: AccessTokenService,
    private readonly sessionRepository: SessionRepository
  ) {}

  /// Ejecuta el flujo de verificación de correo, emisión de tokens de acceso y creación de sesión.
  async execute(
    data: VerifyEmailDTO
  ): Promise<VerifyEmailResultDTO> {
    // Valida que el token proporcionado no esté vacío o compuesto solo por espacios
    if (!data.token || data.token.trim() === "") {
      throw new InvalidVerificationTokenError();
    }

    // Calcula el hash SHA-256 del token plano para compararlo contra la base de datos
    const tokenHash = crypto
      .createHash("sha256")
      .update(data.token)
      .digest("hex");

    // Intenta verificar la cuenta en el repositorio utilizando el hash y la hora actual
    const user = await this.verificationRepository.verifyEmail(
      tokenHash,
      new Date()
    );

    // Lanza error si el token no fue encontrado, estaba expirado o ya había sido consumido
    if (!user) {
      throw new InvalidVerificationTokenError();
    }

    // Genera el JWT de acceso con el id y rol del usuario verificado
    const token = this.accessTokenService.sign({
      id: user.id,
      role: user.role,
    });

    // Registra una nueva sesión activa para generar el refresh token correspondiente
    const session = await this.sessionRepository.createSession(user.id);

    // Retorna los tokens de autenticación y los datos públicos del usuario
    return {
      token,
      refreshToken: session.token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}