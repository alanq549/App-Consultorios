/// ARCHIVO: tests/identity/reset-password.use-case.test.ts
/// Pruebas unitarias para el caso de uso de cambio/restablecimiento de contraseña.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordUseCase } from "@/modules/identity/application/use-cases/reset-password.use-case";
import type { PasswordResetRepository } from "@/modules/identity/application/ports/password-reset-repository";
import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";
import { InvalidPasswordResetTokenError } from "@/modules/identity/domain/identity-errors";

describe("ResetPasswordUseCase", () => {
  // Mocks simulados del repositorio y del servicio de encriptación
  let passwordResetRepository: {
    findValidByToken: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };

  let passwordHasher: {
    hash: ReturnType<typeof vi.fn>;
    compare: ReturnType<typeof vi.fn>;
  };

  let useCase: ResetPasswordUseCase;

  // Reinicia los mocks antes de cada prueba
  beforeEach(() => {
    vi.restoreAllMocks();

    passwordResetRepository = {
      findValidByToken: vi.fn(),
      resetPassword: vi.fn(),
    };

    passwordHasher = {
      hash: vi.fn(),
      compare: vi.fn(),
    };

    useCase = new ResetPasswordUseCase(
      passwordResetRepository as unknown as PasswordResetRepository,
      passwordHasher as unknown as PasswordHasher,
    );
  });

  /// Verifica que se rechace la operación si el token proporcionado no existe o no es válido.
  it("rechaza un token inválido", async () => {
    passwordResetRepository.findValidByToken.mockResolvedValue(null);

    await expect(
      useCase.execute("token-invalido", "NuevaPassword123"),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);

    // Asegura que no se procesó la contraseña ni se intentó cambiar
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(passwordResetRepository.resetPassword).not.toHaveBeenCalled();
  });

  /// Confirma que el sistema no consuma recursos de encriptación (bcrypt) si el token es inválido.
  it("no ejecuta bcrypt cuando el token es inválido", async () => {
    passwordResetRepository.findValidByToken.mockResolvedValue(null);

    await expect(
      useCase.execute("token-invalido", "NuevaPassword123"),
    ).rejects.toThrow("Token inválido o expirado");

    expect(passwordHasher.hash).not.toHaveBeenCalled();
  });

  /// Verifica el flujo exitoso: encripta la nueva clave y actualiza la cuenta del usuario.
  it("hashea la nueva contraseña y ejecuta el reset con un token válido", async () => {
    // Simula un token válido encontrado
    passwordResetRepository.findValidByToken.mockResolvedValue({
      id: 10,
      userId: 1,
      token: "hashed-token",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isUsed: false,
    });

    passwordHasher.hash.mockResolvedValue("new-password-hash");
    passwordResetRepository.resetPassword.mockResolvedValue(true);

    await expect(
      useCase.execute("token-valido", "NuevaPassword123"),
    ).resolves.toBeUndefined();

    // Valida que se haya encriptado la contraseña y enviado la orden de cambio
    expect(passwordHasher.hash).toHaveBeenCalledTimes(1);
    expect(passwordHasher.hash).toHaveBeenCalledWith("NuevaPassword123");

    expect(passwordResetRepository.resetPassword).toHaveBeenCalledTimes(1);
    expect(passwordResetRepository.resetPassword).toHaveBeenCalledWith(
      expect.any(String),
      "new-password-hash",
      expect.any(Date),
    );
  });

  /// Verifica que falle si la base de datos no pudo consumir el token (por concurrencia o estado no válido).
  it("rechaza el reset si la operación atómica no consigue consumir el token", async () => {
    passwordResetRepository.findValidByToken.mockResolvedValue({
      id: 10,
      userId: 1,
      token: "hashed-token",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isUsed: false,
    });

    passwordHasher.hash.mockResolvedValue("new-password-hash");
    // Simula fallo al consumir el token
    passwordResetRepository.resetPassword.mockResolvedValue(false);

    await expect(
      useCase.execute("token-valido", "NuevaPassword123"),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);

    expect(passwordHasher.hash).toHaveBeenCalledTimes(1);
    expect(passwordResetRepository.resetPassword).toHaveBeenCalledTimes(1);
  });
});