import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "@/core/prisma";
import { generateToken } from "./auth.tokens";
import { Role } from "@prisma/client";
import { sendVerificationEmail, sendResetPasswordEmail } from "./auth.mail";
import { RegisterDTO } from "./auth.dto";
import { DEFAULT_AVATAR } from "@/core/config/media";

import { z } from "zod";
import { AppError } from "@/core/errors/AppError";
import { NotificationService } from "../notifications/notifications.service";

type RegisterInput = z.infer<typeof RegisterDTO>;

function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class AuthService {
  static async register(data: RegisterInput) {
    const { email, password, role, profile } = data;
    const hashed = await bcrypt.hash(password, 10);

    try {
      const { user, token } = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, password: hashed, role },
        });

        if (role === Role.CLIENT) {
          await tx.clientProfile.create({
            data: {
              userId: user.id,
              name: profile.name,
              lastName: profile.lastName,
              phone: profile.phone,
              avatar: DEFAULT_AVATAR,
            },
          });
        } else if (role === Role.PROFESSIONAL) {
          if (!profile.specialtyId)
            throw new Error("Specialty requerida para profesionales");

          const specialtyExists = await tx.specialty.findUnique({
            where: { id: profile.specialtyId },
          });
          if (!specialtyExists) throw new Error("Specialty inválida");

          await tx.professionalProfile.create({
            data: {
              userId: user.id,
              name: profile.name,
              lastName: profile.lastName,
              phone: profile.phone,
              avatar: DEFAULT_AVATAR,
              description: profile.description ?? "",

              specialties: {
                create: {
                  specialtyId: profile.specialtyId,
                  status: "PENDING", // o APPROVED si decides
                },
              },
            },
          });
        }

        await tx.customConfig.create({ data: { userId: user.id } });

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        await tx.verificationAttempt.create({
          data: {
            userId: user.id,
            token: tokenHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        return { user, token };
      });
      /// enviar email de verificación (token plano, no hash)
      try {
        await sendVerificationEmail(user.email, token);
      } catch (err) {
        console.error("Error enviando email:", err);
      }

      // Crear notificación de bienvenida (fuera de la transacción principal)
      try {
        await NotificationService.notifyWelcome(user.id);
      } catch (err) {
        console.error("Error creando notificación de bienvenida:", err);
      }

      return user;
    } catch (err: any) {
      // Atrapa errores de Prisma y los lanza como AppError
      if (err.code === "P2002") {
        throw new AppError("Correo ya registrado", 409);
      }
      throw err;
    }
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Credenciales inválidas");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Credenciales inválidas");

    if (!user.isVerified) {
      throw new Error("Cuenta no verificada");
    }

    const accessToken = generateToken({
      userId: user.id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash, // 👈 HASH
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  static async verifyByToken(token: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const attempt = await prisma.verificationAttempt.findFirst({
      where: {
        token: tokenHash,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!attempt) {
      throw new Error("Token inválido o expirado");
    }

    if (attempt.user.isVerified) {
      throw new Error("La cuenta ya está verificada");
    }

    await prisma.verificationAttempt.updateMany({
      where: {
        userId: attempt.userId,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: attempt.userId },
        data: { isVerified: true },
      }),
      prisma.verificationAttempt.update({
        where: { id: attempt.id },
        data: { isUsed: true },
      }),
    ]);

    const authToken = generateToken({
      userId: attempt.user.id,
      role: attempt.user.role,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: attempt.user.id,
        token: refreshTokenHash, // ✅ HASH
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      token: authToken,
      refreshToken,
      user: {
        id: attempt.user.id,
        email: attempt.user.email,
        role: attempt.user.role,
      },
    };
  }

  // refresh con rotación de tokens
  static async refresh(refreshToken: string) {
    const refreshTokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findFirst({
      where: {
        token: refreshTokenHash, // ✅ HASH
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored) {
      throw new Error("Refresh token inválido");
    }

    // 🔁 ROTACIÓN (clave de seguridad)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        token: newRefreshTokenHash, // ✅ HASH
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const newAccessToken = generateToken({
      userId: stored.user.id,
      role: stored.user.role,
    });

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendResetPasswordEmail(email, token); // token plano SOLO por email
  }

  static async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const reset = await prisma.passwordReset.findFirst({
      where: {
        token: tokenHash,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reset) {
      throw new Error("Token inválido o expirado");
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { password: hashed },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { isUsed: true },
      }),
    ]);
  }

  static async resendVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // seguridad: no revelamos si existe o no
      return;
    }

    if (user.isVerified) {
      throw new Error("La cuenta ya está verificada");
    }

    // 🛑 Rate-limit: máx 3 envíos cada 15 minutos
    const recentAttempts = await prisma.verificationAttempt.count({
      where: {
        userId: user.id,
        createdAt: {
          gt: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
    });

    if (recentAttempts >= 3) {
      throw new Error("Demasiados intentos. Intenta más tarde");
    }

    // invalidar tokens anteriores
    await prisma.verificationAttempt.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.verificationAttempt.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendVerificationEmail(email, token);
  }
}
