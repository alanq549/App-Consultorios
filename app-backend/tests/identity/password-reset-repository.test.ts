import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaPasswordResetRepository } from "@/modules/identity/infrastructure/prisma/prisma-password-reset-repository";
import prisma from "@/shared/database/prisma";

const repository = new PrismaPasswordResetRepository();

describe("PrismaPasswordResetRepository", () => {
  let userId: number;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `password-reset-test-${randomUUID()}@example.com`,
        password: "old-password-hash",
      },
    });

    userId = user.id;
  });

  afterEach(async () => {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  });

  it("crea un password reset y permite encontrarlo mientras sea válido", async () => {
    const tokenHash = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const created = await repository.create(
      userId,
      tokenHash,
      expiresAt
    );

    expect(created.userId).toBe(userId);
    expect(created.token).toBe(tokenHash);
    expect(created.isUsed).toBe(false);

    const found = await repository.findValidByToken(
      tokenHash,
      new Date()
    );

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
  });

  it("no devuelve un token expirado", async () => {
    const tokenHash = randomUUID();

    await prisma.passwordReset.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const found = await repository.findValidByToken(
      tokenHash,
      new Date()
    );

    expect(found).toBeNull();
  });

  it("ejecuta el reset de forma atómica", async () => {
    const tokenHash = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
      },
    });

    await prisma.refreshToken.createMany({
      data: [
        {
          userId,
          token: randomUUID(),
          expiresAt,
        },
        {
          userId,
          token: randomUUID(),
          expiresAt,
        },
      ],
    });

    const result = await repository.resetPassword(
      tokenHash,
      "new-password-hash",
      new Date()
    );

    expect(result).toBe(true);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(user?.password).toBe("new-password-hash");

    const reset = await prisma.passwordReset.findUnique({
      where: { token: tokenHash },
    });

    expect(reset?.isUsed).toBe(true);

    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId },
    });

    expect(refreshTokens).toHaveLength(2);
    expect(refreshTokens.every((token) => token.isRevoked)).toBe(true);
  });

  it("solo permite un reset cuando dos solicitudes concurrentes usan el mismo token", async () => {
    const tokenHash = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
      },
    });

    const [first, second] = await Promise.all([
      repository.resetPassword(
        tokenHash,
        "password-hash-a",
        new Date()
      ),
      repository.resetPassword(
        tokenHash,
        "password-hash-b",
        new Date()
      ),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect([first, second].filter((value) => !value)).toHaveLength(1);

    const reset = await prisma.passwordReset.findUnique({
      where: { token: tokenHash },
    });

    expect(reset?.isUsed).toBe(true);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect([
      "password-hash-a",
      "password-hash-b",
    ]).toContain(user?.password);
  });
});