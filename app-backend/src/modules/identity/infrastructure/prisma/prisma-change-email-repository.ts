/// ARCHIVO: src/modules/identity/infrastructure/prisma/prisma-change-email-repository.ts
/// Adaptador que implementa el repositorio de cambio de correo electrónico utilizando Prisma y transacciones.

import crypto from "crypto";
import prisma from "@/shared/database/prisma";
import type {
    ChangeEmailRepository,
    ChangeEmailResult,
} from "@/modules/identity/application/ports/change-email-repository";
import { EmailAlreadyInUseError } from "../../domain/identity-errors";

export class PrismaChangeEmailRepository
    implements ChangeEmailRepository {
    /// Actualiza el correo electrónico del usuario, invalida sesiones, invalida tokens anteriores y genera un nuevo token de verificación.
    async changeEmail(
        userId: number,
        newEmail: string,
        now: Date
    ): Promise<ChangeEmailResult> {
        return prisma.$transaction(async (tx) => {
            // Verifica si el nuevo correo electrónico ya está registrado por otro usuario
            const existingUser = await tx.user.findUnique({
                where: { email: newEmail },
                select: {
                    id: true,
                    isVerified: true,
                },
            });

            // Lanza un error si el correo ya está en uso por otro usuario o si el usuario que intenta cambiar su correo ya está verificado con ese correo
            if (
                existingUser &&
                (
                    existingUser.id !== userId ||
                    existingUser.isVerified
                )
                // Si el correo ya está en uso por otro usuario o si el usuario que intenta cambiar su correo ya está verificado con ese correo, se lanza un error.
            ) {
                throw new EmailAlreadyInUseError();
            }

            // Genera un token aleatorio seguro de 32 bytes en formato hexadecimal y calcula su hash SHA-256
            const verificationToken = crypto.randomBytes(32).toString("hex");
            const verificationTokenHash = crypto
                .createHash("sha256")
                .update(verificationToken)
                .digest("hex");

            // Actualiza el correo electrónico del usuario y restablece el estado de verificación
            await tx.user.update({
                where: { id: userId },
                data: {
                    email: newEmail,
                    isVerified: false,
                },
            });

            // Invalida todos los tokens de refresco activos del usuario por seguridad
            await tx.refreshToken.updateMany({
                where: { userId },
                data: {
                    isRevoked: true,
                },
            });

            // Marca como usados todos los intentos de verificación anteriores no utilizados
            await tx.verificationAttempt.updateMany({
                where: {
                    userId,
                    isUsed: false,
                },
                data: {
                    isUsed: true,
                },
            });

            // Crea un nuevo registro de intento de verificación con expiración de 10 minutos
            await tx.verificationAttempt.create({
                data: {
                    userId,
                    token: verificationTokenHash,
                    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
                },
            });

            // Retorna el nuevo correo y el token plano generado
            return {
                email: newEmail,
                verificationToken,
            };
        });
    }
}