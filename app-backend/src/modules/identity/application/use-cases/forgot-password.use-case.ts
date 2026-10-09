/// ARCHIVO: src/modules/identity/application/use-cases/forgot-password.use-case.ts
/// Caso de uso para solicitar la recuperación de contraseña generando un token seguro y enviando un correo al usuario.

import crypto from "crypto";

import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import type { PasswordResetRepository } from "@/modules/identity/application/ports/password-reset-repository";
import type { PasswordResetMailer } from "@/modules/identity/application/ports/password-reset-mailer";

export class ForgotPasswordUseCase {
  constructor(
    private readonly userAccountRepository: UserAccountRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly passwordResetMailer: PasswordResetMailer
  ) { }

  /// Ejecuta la solicitud de recuperación: genera un token aleatorio, guarda su hash y envía el enlace por correo.
  async execute(email: string): Promise<void> {
    // Valida primero la configuración requerida para construir el enlace de recuperación
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error(
        "La variable de entorno para el frontend no está configurada"
      );
    }

    // Busca al usuario por su correo electrónico
    const user = await this.userAccountRepository.findByEmail(email);

    // Retorna en silencio si el correo no existe para evitar el mapeo/enumeración de usuarios
    if (!user) {
      return;
    }

    // Genera un token aleatorio seguro de 32 bytes en formato hexadecimal
    const token = crypto.randomBytes(32).toString("hex");

    // Calcula el hash SHA-256 del token generado para almacenarlo de forma segura
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Establece el tiempo de expiración del token (15 minutos a partir del momento actual)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Guarda el intento de restablecimiento de contraseña en la base de datos
    await this.passwordResetRepository.create(
      user.id,
      tokenHash,
      expiresAt
    );

    // Construye el enlace de restablecimiento con el token plano enviado como parámetro
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Registramos el error de forma segura pero no lo propagamos
    // para evitar revelar si el usuario existe o no.
    try {
      await this.passwordResetMailer.sendResetPasswordEmail(user.email, resetUrl);
    } catch (error) {
      console.error("[Identity] Error enviando email de recuperación:", error);
    }
  }
}