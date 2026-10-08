/// ARCHIVO: src/modules/identity/application/ports/password-reset-mailer.ts
/// Puerto del servicio de mensajería para definir el contrato de envío de correos de restablecimiento de contraseña.

/// Contrato que deben implementar los adaptadores de infraestructura para enviar notificaciones de recuperación por correo.
export interface PasswordResetMailer {
  /// Envía un correo electrónico al usuario con el enlace seguro para restablecer su contraseña.
  sendResetPasswordEmail(
    email: string,
    resetUrl: string
  ): Promise<void>;
}