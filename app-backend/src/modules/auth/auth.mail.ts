// src/modules/auth/auth.mail.ts
import nodemailer from "nodemailer";
const { MAIL_USER, MAIL_PASS, MAIL_FROM } = process.env;

if (!MAIL_USER || !MAIL_PASS || !MAIL_FROM) {
  throw new Error("Configuración de correo incompleta");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
 auth: {
  user: MAIL_USER,
  pass: MAIL_PASS,
},
});

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "Verifica tu cuenta",
    html: `
      <h2>Bienvenido 👋</h2>
      <p>Haz clic para verificar tu cuenta:</p>
      <a href="${url}">Verificar cuenta</a>
      <p>Este enlace expira en 10 minutos.</p>
    `,
  });
}

export async function sendResetPasswordEmail(email: string, resetUrl: string) {
  await transporter.sendMail({
    from: MAIL_FROM,
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
  })
}



