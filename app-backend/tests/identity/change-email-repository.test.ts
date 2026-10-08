/// ARCHIVO: tests/identity/change-email-repository.test.ts
/// Pruebas de integración para PrismaChangeEmailRepository usando Vitest y Prisma ORM.
///
/// Propósito: Validar el comportamiento transaccional del cambio de correo electrónico en la base de datos:
/// - Actualización de email y desverificación de la cuenta.
/// - Revocación de sesiones activas (refresh tokens).
/// - Gestión de intentos de verificación (invalidación previa y hashing SHA-256 de nuevos tokens).
/// - Configuración del tiempo de expiración (10 minutos).
/// - Control de duplicados y prevención de conflictos de correo.

import { describe, expect, it } from "vitest";
import crypto from "crypto";
import prisma from "@/shared/database/prisma";
import { PrismaChangeEmailRepository } from "@/modules/identity/infrastructure/prisma/prisma-change-email-repository";

describe("PrismaChangeEmailRepository", () => {
    const repository = new PrismaChangeEmailRepository();

    /// Comprueba que el correo del usuario cambie correctamente y que el estado 'isVerified' pase a false.
    it("actualiza el correo y marca la cuenta como no verificada", async () => {
        const user = await prisma.user.create({
            data: {
                email: `change-email-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        const newEmail = `new-email-${crypto.randomUUID()}@example.com`;

        const result = await repository.changeEmail(
            user.id,
            newEmail,
            new Date()
        );

        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id },
        });

        expect(result.email).toBe(newEmail);
        expect(result.verificationToken).toBeTruthy();

        expect(updatedUser?.email).toBe(newEmail);
        expect(updatedUser?.isVerified).toBe(false);
    });

    /// Verifica la seguridad del cambio de correo invalidando (isRevoked = true) todos los refresh tokens activos.
    it("revoca todos los refresh tokens del usuario", async () => {
        const user = await prisma.user.create({
            data: {
                email: `refresh-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        await prisma.refreshToken.createMany({
            data: [
                {
                    userId: user.id,
                    token: crypto.randomUUID(),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                    isRevoked: false,
                },
                {
                    userId: user.id,
                    token: crypto.randomUUID(),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                    isRevoked: false,
                },
            ],
        });

        await repository.changeEmail(
            user.id,
            `new-${crypto.randomUUID()}@example.com`,
            new Date()
        );

        const refreshTokens = await prisma.refreshToken.findMany({
            where: { userId: user.id },
        });

        expect(refreshTokens).toHaveLength(2);
        expect(refreshTokens.every((token) => token.isRevoked)).toBe(true);
    });

    /// Confirma que cualquier intento previo de verificación sin utilizar pase a estar marcado como usado (isUsed = true).
    it("invalida los intentos de verificación anteriores", async () => {
        const user = await prisma.user.create({
            data: {
                email: `verification-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        await prisma.verificationAttempt.create({
            data: {
                userId: user.id,
                token: crypto
                    .createHash("sha256")
                    .update(`old-${crypto.randomUUID()}`)
                    .digest("hex"),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                isUsed: false,
            },
        });

        await repository.changeEmail(
            user.id,
            `new-${crypto.randomUUID()}@example.com`,
            new Date()
        );

        const attempts = await prisma.verificationAttempt.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        });

        expect(attempts.length).toBe(2);

        const previousAttempt = attempts[0];
        const newAttempt = attempts[1];

        expect(previousAttempt.isUsed).toBe(true);
        expect(newAttempt.isUsed).toBe(false);
    });

    /// Garantiza que el token entregado al cliente sea en texto plano, pero en base de datos se guarde su hash SHA-256.
    it("crea un nuevo token de verificación almacenando únicamente su hash", async () => {
        const user = await prisma.user.create({
            data: {
                email: `token-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        const newEmail = `new-${crypto.randomUUID()}@example.com`;

        const result = await repository.changeEmail(
            user.id,
            newEmail,
            new Date()
        );

        const attempt = await prisma.verificationAttempt.findFirst({
            where: {
                userId: user.id,
                isUsed: false,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        expect(attempt).not.toBeNull();
        expect(attempt?.token).not.toBe(result.verificationToken);

        const expectedHash = crypto
            .createHash("sha256")
            .update(result.verificationToken)
            .digest("hex");

        expect(attempt?.token).toBe(expectedHash);
    });

    /// Valida que la fecha de expiración generada para el token sea exactamente de 10 minutos a partir de la ejecución.
    it("crea el token de verificación con expiración de 10 minutos", async () => {
        const user = await prisma.user.create({
            data: {
                email: `expiry-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        const now = new Date();

        await repository.changeEmail(
            user.id,
            `new-${crypto.randomUUID()}@example.com`,
            now
        );

        const attempt = await prisma.verificationAttempt.findFirst({
            where: {
                userId: user.id,
                isUsed: false,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        expect(attempt).not.toBeNull();

        const expectedExpiration =
            now.getTime() + 10 * 60 * 1000;

        expect(attempt!.expiresAt.getTime()).toBe(expectedExpiration);
    });


    it("permite regenerar la verificación cuando el correo ya pertenece al mismo usuario y la cuenta no está verificada", async () => {
        const user = await prisma.user.create({
            data: {
                email: `retry-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: false,
            },
        });

        const previousPlainToken = `old-${crypto.randomUUID()}`;

        await prisma.verificationAttempt.create({
            data: {
                userId: user.id,
                token: crypto
                    .createHash("sha256")
                    .update(previousPlainToken)
                    .digest("hex"),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                isUsed: false,
            },
        });

        const result = await repository.changeEmail(
            user.id,
            user.email,
            new Date(),
        );

        expect(result.email).toBe(user.email);
        expect(result.verificationToken).toBeTruthy();
        expect(result.verificationToken).not.toBe(previousPlainToken);

        const attempts = await prisma.verificationAttempt.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        });

        expect(attempts).toHaveLength(2);
        expect(attempts[0].isUsed).toBe(true);
        expect(attempts[1].isUsed).toBe(false);

        const expectedHash = crypto
            .createHash("sha256")
            .update(result.verificationToken)
            .digest("hex");

        expect(attempts[1].token).toBe(expectedHash);
    });


    it("rechaza reutilizar el correo actual cuando la cuenta ya está verificada", async () => {
        const user = await prisma.user.create({
            data: {
                email: `verified-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        await expect(
            repository.changeEmail(
                user.id,
                user.email,
                new Date(),
            ),
        ).rejects.toThrow("El correo ya está en uso");

        const unchangedUser = await prisma.user.findUnique({
            where: { id: user.id },
        });

        expect(unchangedUser?.email).toBe(user.email);
        expect(unchangedUser?.isVerified).toBe(true);
    });

    /// Asegura que el proceso falle si se intenta cambiar el correo por uno registrado previamente por otro usuario.
    it("rechaza un correo que ya pertenece a otro usuario", async () => {
        const existingUser = await prisma.user.create({
            data: {
                email: `existing-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        const user = await prisma.user.create({
            data: {
                email: `current-${crypto.randomUUID()}@example.com`,
                password: "hashed-password",
                role: "CLIENT",
                isVerified: true,
            },
        });

        await expect(
            repository.changeEmail(
                user.id,
                existingUser.email,
                new Date()
            )
        ).rejects.toThrow("El correo ya está en uso");

        const unchangedUser = await prisma.user.findUnique({
            where: { id: user.id },
        });

        expect(unchangedUser?.email).toBe(user.email);
        expect(unchangedUser?.isVerified).toBe(true);
    });
});