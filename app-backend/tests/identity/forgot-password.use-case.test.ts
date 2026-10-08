/// ARCHIVO: tests/identity/forgot-password.use-case.test.ts
/// Pruebas unitarias para el caso de uso de solicitud de recuperación de contraseña.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordUseCase } from "@/modules/identity/application/use-cases/forgot-password.use-case";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import type { PasswordResetRepository } from "@/modules/identity/application/ports/password-reset-repository";
import type { PasswordResetMailer } from "@/modules/identity/application/ports/password-reset-mailer";

describe("ForgotPasswordUseCase", () => {
  let userAccountRepository: {
    findByEmail: ReturnType<typeof vi.fn>;
  };

  let passwordResetRepository: {
    create: ReturnType<typeof vi.fn>;
  };

  let passwordResetMailer: {
    sendResetPasswordEmail: ReturnType<typeof vi.fn>;
  };

  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    vi.restoreAllMocks();

    process.env.FRONTEND_URL = "http://localhost:3000";

    userAccountRepository = {
      findByEmail: vi.fn(),
    };

    passwordResetRepository = {
      create: vi.fn(),
    };

    passwordResetMailer = {
      sendResetPasswordEmail: vi.fn(),
    };

    useCase = new ForgotPasswordUseCase(
      userAccountRepository as unknown as UserAccountRepository,
      passwordResetRepository as unknown as PasswordResetRepository,
      passwordResetMailer as unknown as PasswordResetMailer,
    );
  });

  it("no crea un reset cuando el usuario no existe", async () => {
    userAccountRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute("no-existe@example.com"),
    ).resolves.toBeUndefined();

    expect(userAccountRepository.findByEmail).toHaveBeenCalledWith(
      "no-existe@example.com",
    );

    expect(passwordResetRepository.create).not.toHaveBeenCalled();
    expect(
      passwordResetMailer.sendResetPasswordEmail,
    ).not.toHaveBeenCalled();
  });

  it("crea el reset y envía el correo cuando el usuario existe", async () => {
    userAccountRepository.findByEmail.mockResolvedValue({
      id: 1,
      email: "user@example.com",
    });

    passwordResetRepository.create.mockResolvedValue({
      id: 10,
      userId: 1,
      token: "hashed-token",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isUsed: false,
    });

    passwordResetMailer.sendResetPasswordEmail.mockResolvedValue(undefined);

    await expect(
      useCase.execute("user@example.com"),
    ).resolves.toBeUndefined();

    expect(passwordResetRepository.create).toHaveBeenCalledTimes(1);
    expect(passwordResetRepository.create).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(Date),
    );

    expect(
      passwordResetMailer.sendResetPasswordEmail,
    ).toHaveBeenCalledTimes(1);

    const [email, resetUrl] =
      passwordResetMailer.sendResetPasswordEmail.mock.calls[0];

    expect(email).toBe("user@example.com");
    expect(resetUrl).toMatch(
      /^http:\/\/localhost:3000\/reset-password\?token=[a-f0-9]{64}$/,
    );
  });

  it("falla si FRONTEND_URL no está configurado antes de consultar la cuenta", async () => {
    delete process.env.FRONTEND_URL;

    await expect(
      useCase.execute("user@example.com"),
    ).rejects.toThrow(
      "La variable de entorno para el frontend no está configurada",
    );

    expect(userAccountRepository.findByEmail).not.toHaveBeenCalled();
    expect(passwordResetRepository.create).not.toHaveBeenCalled();
    expect(
      passwordResetMailer.sendResetPasswordEmail,
    ).not.toHaveBeenCalled();
  });

  it("falla de la misma forma si FRONTEND_URL no está configurado y la cuenta no existe", async () => {
    delete process.env.FRONTEND_URL;

    await expect(
      useCase.execute("nonexistent@example.com"),
    ).rejects.toThrow(
      "La variable de entorno para el frontend no está configurada",
    );

    expect(userAccountRepository.findByEmail).not.toHaveBeenCalled();
    expect(passwordResetRepository.create).not.toHaveBeenCalled();
    expect(
      passwordResetMailer.sendResetPasswordEmail,
    ).not.toHaveBeenCalled();
  });

  it("propaga el error si el envío del correo falla", async () => {
    userAccountRepository.findByEmail.mockResolvedValue({
      id: 1,
      email: "user@example.com",
    });

    passwordResetRepository.create.mockResolvedValue({
      id: 10,
      userId: 1,
      token: "hashed-token",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isUsed: false,
    });

    passwordResetMailer.sendResetPasswordEmail.mockRejectedValue(
      new Error("SMTP connection failed"),
    );

    await expect(useCase.execute("user@example.com")).rejects.toThrow(
      "SMTP connection failed",
    );

    expect(passwordResetRepository.create).toHaveBeenCalledTimes(1);
    expect(
      passwordResetMailer.sendResetPasswordEmail,
    ).toHaveBeenCalledTimes(1);
  });
});
