/// ARCHIVO: src/modules/identity/infrastructure/mail/nodemailer-password-reset-mailer.ts
/// Implementación de PasswordResetMailer utilizando Nodemailer para el envío de correos electrónicos de recuperación.

import nodemailer from "nodemailer";
import type { PasswordResetMailer } from "@/modules/identity/application/ports/password-reset-mailer";

export class NodemailerPasswordResetMailer
  implements PasswordResetMailer
{
  private readonly transporter;
  private readonly mailFrom: string;

  constructor() {
    const { MAIL_USER, MAIL_PASS, MAIL_FROM } = process.env;

    // Lanza un error al inicializar si faltan las credenciales de correo en las variables de entorno
    if (!MAIL_USER || !MAIL_PASS || !MAIL_FROM) {
      throw new Error("Configuración de correo incompleta");
    }

    this.mailFrom = MAIL_FROM;

    // Configura el transporte de Nodemailer para el envío de correos vía Gmail
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });
  }

  /// Envía un correo con formato HTML que contiene la URL con el token para restablecer la contraseña.
  async sendResetPasswordEmail(
    email: string,
    resetUrl: string
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.mailFrom,
      to: email,
      subject: "Restablecer contraseña",
      html: `
        <h2>Restablecer contraseña</h2>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${resetUrl}">
          Restablecer contraseña
        </a>
        <p>Este enlace expira en 15 minutos.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `,
    });
  }
}