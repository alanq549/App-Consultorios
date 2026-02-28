"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("@/core/prisma"));
const auth_tokens_1 = require("./auth.tokens");
const client_1 = require("@prisma/client");
const auth_mail_1 = require("./auth.mail");
const media_1 = require("@/core/config/media");
const AppError_1 = require("@/core/errors/AppError");
function generateRefreshToken() {
    return crypto_1.default.randomBytes(64).toString("hex");
}
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
class AuthService {
    static async register(data) {
        const { email, password, role, profile } = data;
        const hashed = await bcrypt_1.default.hash(password, 10);
        try {
            const { user, token } = await prisma_1.default.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: { email, password: hashed, role },
                });
                if (role === client_1.Role.CLIENT) {
                    await tx.clientProfile.create({
                        data: {
                            userId: user.id,
                            name: profile.name,
                            lastName: profile.lastName,
                            phone: profile.phone,
                            avatar: media_1.DEFAULT_AVATAR,
                        },
                    });
                }
                else if (role === client_1.Role.PROFESSIONAL) {
                    if (!profile.specialtyId)
                        throw new Error("Specialty requerida para profesionales");
                    const specialtyExists = await tx.specialty.findUnique({
                        where: { id: profile.specialtyId },
                    });
                    if (!specialtyExists)
                        throw new Error("Specialty inválida");
                    await tx.professionalProfile.create({
                        data: {
                            userId: user.id,
                            name: profile.name,
                            lastName: profile.lastName,
                            phone: profile.phone,
                            avatar: media_1.DEFAULT_AVATAR,
                            specialtyId: profile.specialtyId,
                            description: profile.description ?? "",
                        },
                    });
                }
                await tx.customConfig.create({ data: { userId: user.id } });
                const token = crypto_1.default.randomBytes(32).toString("hex");
                const tokenHash = crypto_1.default
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
            try {
                await (0, auth_mail_1.sendVerificationEmail)(user.email, token);
            }
            catch (err) {
                console.error("Error enviando email:", err);
            }
            return user;
        }
        catch (err) {
            // Atrapa errores de Prisma y los lanza como AppError
            if (err.code === "P2002") {
                throw new AppError_1.AppError("Correo ya registrado", 409);
            }
            throw err;
        }
    }
    static async login(email, password) {
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user)
            throw new Error("Credenciales inválidas");
        const valid = await bcrypt_1.default.compare(password, user.password);
        if (!valid)
            throw new Error("Credenciales inválidas");
        if (!user.isVerified) {
            throw new Error("Cuenta no verificada");
        }
        const accessToken = (0, auth_tokens_1.generateToken)({
            userId: user.id,
            role: user.role,
        });
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(refreshToken);
        await prisma_1.default.refreshToken.create({
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
    static async verifyByToken(token) {
        const tokenHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
        const attempt = await prisma_1.default.verificationAttempt.findFirst({
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
        await prisma_1.default.verificationAttempt.updateMany({
            where: {
                userId: attempt.userId,
                isUsed: false,
            },
            data: { isUsed: true },
        });
        await prisma_1.default.$transaction([
            prisma_1.default.user.update({
                where: { id: attempt.userId },
                data: { isVerified: true },
            }),
            prisma_1.default.verificationAttempt.update({
                where: { id: attempt.id },
                data: { isUsed: true },
            }),
        ]);
        const authToken = (0, auth_tokens_1.generateToken)({
            userId: attempt.user.id,
            role: attempt.user.role,
        });
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(refreshToken);
        await prisma_1.default.refreshToken.create({
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
    static async refresh(refreshToken) {
        const refreshTokenHash = hashToken(refreshToken);
        const stored = await prisma_1.default.refreshToken.findFirst({
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
        await prisma_1.default.refreshToken.update({
            where: { id: stored.id },
            data: { isRevoked: true },
        });
        const newRefreshToken = generateRefreshToken();
        const newRefreshTokenHash = hashToken(newRefreshToken);
        await prisma_1.default.refreshToken.create({
            data: {
                userId: stored.userId,
                token: newRefreshTokenHash, // ✅ HASH
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        const newAccessToken = (0, auth_tokens_1.generateToken)({
            userId: stored.user.id,
            role: stored.user.role,
        });
        return {
            token: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    static async forgotPassword(email) {
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user)
            return;
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const tokenHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
        await prisma_1.default.passwordReset.create({
            data: {
                userId: user.id,
                token: tokenHash,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });
        await (0, auth_mail_1.sendResetPasswordEmail)(email, token); // token plano SOLO por email
    }
    static async resetPassword(token, newPassword) {
        const tokenHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
        const reset = await prisma_1.default.passwordReset.findFirst({
            where: {
                token: tokenHash,
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
        });
        if (!reset) {
            throw new Error("Token inválido o expirado");
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.$transaction([
            prisma_1.default.user.update({
                where: { id: reset.userId },
                data: { password: hashed },
            }),
            prisma_1.default.passwordReset.update({
                where: { id: reset.id },
                data: { isUsed: true },
            }),
        ]);
    }
    static async resendVerification(email) {
        const user = await prisma_1.default.user.findUnique({
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
        const recentAttempts = await prisma_1.default.verificationAttempt.count({
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
        await prisma_1.default.verificationAttempt.updateMany({
            where: {
                userId: user.id,
                isUsed: false,
            },
            data: { isUsed: true },
        });
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const tokenHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
        await prisma_1.default.verificationAttempt.create({
            data: {
                userId: user.id,
                token: tokenHash,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });
        await (0, auth_mail_1.sendVerificationEmail)(email, token);
    }
}
exports.AuthService = AuthService;
