/// ARCHIVO: src/modules/identity/infrastructure/mail/nodemailer-verification-mailer.ts
/// Implementación de VerificationMailer utilizando Nodemailer para el envío de correos electrónicos de verificación de cuenta.

import nodemailer from "nodemailer";
import type { VerificationMailer } from "@/modules/identity/application/ports/verification-mailer";

export class NodemailerVerificationMailer implements VerificationMailer {
  private transporter;

  constructor() {
    // Inicializa el transporte de correo dinámicamente con variables de entorno o valores por defecto para SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  /// Envía un correo electrónico con un enlace en formato HTML para que el usuario complete la verificación de su cuenta.
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"Impulsa Suite" <no-reply@impulsa.com>',
      to: email,
      subject: "Verifica tu correo electrónico",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Verificación de correo</h2>
          <p>Has solicitado cambiar o verificar tu correo en la plataforma.</p>
          <p>Haz clic en el siguiente enlace para completar la verificación:</p>
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
            Verificar mi correo
          </a>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      `,
    });
  }
}