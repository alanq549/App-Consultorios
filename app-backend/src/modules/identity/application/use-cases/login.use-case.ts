/// ARCHIVO: src/modules/identity/application/use-cases/login.use-case.ts
/// Caso de uso que gestiona el proceso de inicio de sesión y autenticación de usuarios.

import type { AccessTokenService } from "@/modules/identity/application/ports/access-token-service";
import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";
import type { SessionRepository } from "@/modules/identity/application/ports/session-repository";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import { InvalidCredentialsError } from "../../domain/identity-errors";

/// Datos requeridos para iniciar sesión.
export interface LoginDTO {
  email: string;
  password: string;
}

/// Estructura de respuesta con los tokens y datos básicos del usuario tras un login exitoso.
export interface LoginResultDTO {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
    isVerified: boolean;
  };
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserAccountRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenService: AccessTokenService,
    private readonly sessionRepository: SessionRepository
  ) { }

  /// Ejecuta la validación de credenciales y la generación de la sesión.
  async execute(data: LoginDTO): Promise<LoginResultDTO> {
      // Conserva el comportamiento actual: búsqueda exacta del correo.
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Compara la contraseña enviada con el hash guardado
    const passwordValid = await this.passwordHasher.compare(
      data.password,
      user.passwordHash
    );

    if (!passwordValid) {
      throw new InvalidCredentialsError();
    }

    // Verifica que la cuenta esté validada antes de permitir el acceso
    if (!user.isVerified) {
      throw new InvalidCredentialsError();
    }

    // Genera el access token JWT firmado
    const token = this.accessTokenService.sign({
      id: user.id,
      role: user.role,
    });

    // Crea y almacena la nueva sesión de refresco (refresh token)
    const session = await this.sessionRepository.createSession(user.id);

    return {
      token,
      refreshToken: session.token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }
}