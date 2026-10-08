/// ARCHIVO: tests/identity/change-password.use-case.test.ts
/// Pruebas unitarias para el caso de uso de cambio de contraseña (ChangePasswordUseCase).

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChangePasswordUseCase } from "@/modules/identity/application/use-cases/change-password.use-case";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";
import type { PasswordChangeRepository } from "@/modules/identity/application/ports/password-change-repository";
import {
  InvalidCurrentPasswordError,
  UserAccountNotFoundError,
} from "@/modules/identity/domain/identity-errors";

describe("ChangePasswordUseCase", () => {
  // Mocks para los puertos utilizados por el caso de uso
  let userAccountRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  let passwordHasher: {
    compare: ReturnType<typeof vi.fn>;
    hash: ReturnType<typeof vi.fn>;
  };

  let passwordChangeRepository: {
    changePassword: ReturnType<typeof vi.fn>;
  };

  let useCase: ChangePasswordUseCase;

  // Restablece los mocks e instancia el caso de uso antes de cada prueba
  beforeEach(() => {
    vi.restoreAllMocks();

    userAccountRepository = {
      findById: vi.fn(),
    };

    passwordHasher = {
      compare: vi.fn(),
      hash: vi.fn(),
    };

    passwordChangeRepository = {
      changePassword: vi.fn(),
    };

    useCase = new ChangePasswordUseCase(
      userAccountRepository as unknown as UserAccountRepository,
      passwordHasher as unknown as PasswordHasher,
      passwordChangeRepository as unknown as PasswordChangeRepository,
    );
  });

  /// Verifica que se lance una excepción si el usuario no existe en el sistema.
  it("rechaza el cambio si la cuenta no existe", async () => {
    // Simula que no se encuentra ninguna cuenta para el ID proporcionado
    userAccountRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 999,
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      }),
    ).rejects.toBeInstanceOf(UserAccountNotFoundError);

    // Asegura que no se llamen a los métodos de hash ni al repositorio de cambio
    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(
      passwordChangeRepository.changePassword,
    ).not.toHaveBeenCalled();
  });

  /// Verifica que se lance una excepción si la contraseña actual no coincide.
  it("rechaza el cambio si la contraseña actual es incorrecta", async () => {
    // Simula la existencia del usuario
    userAccountRepository.findById.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      passwordHash: "stored-password-hash",
      role: "CLIENT",
      isVerified: true,
    });

    // Simula fallo en la validación de la contraseña actual
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword123",
      }),
    ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);

    // Valida que se comparó la contraseña correctamente
    expect(passwordHasher.compare).toHaveBeenCalledTimes(1);
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      "WrongPassword123",
      "stored-password-hash",
    );

    // Asegura que no se generó hash ni se actualizó la contraseña
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(
      passwordChangeRepository.changePassword,
    ).not.toHaveBeenCalled();
  });

  /// Verifica la ejecución exitosa del flujo completo de cambio de contraseña.
  it("hashea la nueva contraseña y ejecuta el cambio", async () => {
    // Simula el usuario existente y respuestas exitosas de las dependencias
    userAccountRepository.findById.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      passwordHash: "stored-password-hash",
      role: "CLIENT",
      isVerified: true,
    });

    passwordHasher.compare.mockResolvedValue(true);
    passwordHasher.hash.mockResolvedValue("new-password-hash");
    passwordChangeRepository.changePassword.mockResolvedValue(undefined);

    // Ejecuta y verifica la respuesta del caso de uso
    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "CurrentPassword123",
        newPassword: "NewPassword123",
      }),
    ).resolves.toEqual({
      message: "Contraseña actualizada",
    });

    // Valida la interacción con las dependencias
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      "CurrentPassword123",
      "stored-password-hash",
    );

    expect(passwordHasher.hash).toHaveBeenCalledTimes(1);
    expect(passwordHasher.hash).toHaveBeenCalledWith(
      "NewPassword123",
    );

    expect(
      passwordChangeRepository.changePassword,
    ).toHaveBeenCalledTimes(1);

    expect(
      passwordChangeRepository.changePassword,
    ).toHaveBeenCalledWith(
      1,
      "new-password-hash",
    );
  });

  /// Verifica la captura del mensaje de error al fallar la verificación de la contraseña actual.
  it("no cambia la contraseña si la verificación actual falla", async () => {
    // Simula la existencia del usuario
    userAccountRepository.findById.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      passwordHash: "stored-password-hash",
      role: "CLIENT",
      isVerified: true,
    });

    // Simula la falla de coincidencia de contraseña
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword123",
      }),
    ).rejects.toThrow("Contraseña actual incorrecta");

    // Confirma que se detuvo la ejecución sin realizar cambios
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(
      passwordChangeRepository.changePassword,
    ).not.toHaveBeenCalled();
  });
});