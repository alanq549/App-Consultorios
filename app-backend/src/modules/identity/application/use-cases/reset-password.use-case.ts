/// ARCHIVO: src/modules/identity/application/use-cases/reset-password.use-case.ts
/// Caso de uso para cambiar la contraseña usando un token de recuperación.

import crypto from "crypto";

import type { PasswordResetRepository } from "@/modules/identity/application/ports/password-reset-repository";
import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";

import { InvalidPasswordResetTokenError } from "@/modules/identity/domain/identity-errors";

export class ResetPasswordUseCase {
  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly passwordHasher: PasswordHasher
  ) { }

  /// Procesa el cambio de contraseña: valida el token recibido y guarda la nueva clave de forma segura.
  async execute(token: string, newPassword: string): Promise<void> {
    const now = new Date();

    // Convierte el token recibido a su hash para buscarlo en la base de datos
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Valida primero que el token exista, no esté usado y no haya expirado.
    // Esto evita ejecutar bcrypt para tokens inválidos.
    const reset = await this.passwordResetRepository.findValidByToken(
      tokenHash,
      now
    );

    if (!reset) {
      throw new InvalidPasswordResetTokenError();
    }

    // El token es válido, por lo que ahora sí se ejecuta bcrypt.
    const passwordHash = await this.passwordHasher.hash(newPassword);

    // El repositorio vuelve a validar y consume el token dentro de una
    // transacción atómica. Esta segunda validación es necesaria para
    // protegernos contra condiciones de carrera.
    const updated = await this.passwordResetRepository.resetPassword(
      tokenHash,
      passwordHash,
      now
    );

    if (!updated) {
      throw new InvalidPasswordResetTokenError();
    }
  }
}