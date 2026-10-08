/// ARCHIVO: src/modules/identity/application/ports/verification-mailer.ts
/// Puerto que define las operaciones para el envío de correos electrónicos de verificación.

export interface VerificationMailer {
  sendVerificationEmail(
    email: string,
    token: string
  ): Promise<void>;
}