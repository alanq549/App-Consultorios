/// ARCHIVO: tests/identity/change-email.use-case.test.ts
/// Pruebas unitarias para el caso de uso de cambio de correo electrónico (ChangeEmailUseCase).
///
/// Propósito: Validar el flujo de control y orquestación del caso de uso al solicitar cambio de email:
/// - Verificación de la existencia del usuario en la base de datos.
/// - Comparación y validación de la contraseña actual introducida.
/// - Ejecución del cambio mediante el repositorio e instanciación de fecha.
/// - Envío del correo de verificación con el token recibido en formato plano.
/// - Manejo y propagación de errores de dominio (UserAccountNotFoundError, InvalidCurrentPasswordError) y de infraestructura (DB / Mailer).

import { describe, expect, it, vi } from "vitest";
import { ChangeEmailUseCase } from "@/modules/identity/application/use-cases/change-email-use-case";
import type { ChangeEmailRepository } from "@/modules/identity/application/ports/change-email-repository";
import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import type { VerificationMailer } from "@/modules/identity/application/ports/verification-mailer";
import {
  InvalidCurrentPasswordError,
  UserAccountNotFoundError,
} from "@/modules/identity/domain/identity-errors";

describe("ChangeEmailUseCase", () => {
  // Inicialización de las dependencias mockeadas para ser compartidas en la suite de pruebas
  const userRepository: UserAccountRepository = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
  };

  const passwordHasher: PasswordHasher = {
    compare: vi.fn(),
    hash: vi.fn(),
  };

  const changeEmailRepository: ChangeEmailRepository = {
    changeEmail: vi.fn(),
  };

  const verificationMailer: VerificationMailer = {
    sendVerificationEmail: vi.fn(),
  };

  // Instancia única del caso de uso inyectando los mocks
  const useCase = new ChangeEmailUseCase(
    userRepository,
    passwordHasher,
    changeEmailRepository,
    verificationMailer,
  );

  /// Comprueba que si el repositorio no encuentra al usuario, la ejecución se interrumpe lanzando 'UserAccountNotFoundError'.
  it("rechaza el cambio si el usuario no existe", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 999,
        currentPassword: "current-password",
        newEmail: "new@example.com",
      }),
    ).rejects.toBeInstanceOf(UserAccountNotFoundError);

    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(changeEmailRepository.changeEmail).not.toHaveBeenCalled();
    expect(
      verificationMailer.sendVerificationEmail,
    ).not.toHaveBeenCalled();
  });

  /// Valida que si la contraseña actual no coincide con la almacenada, se interrumpe el flujo lanzando 'InvalidCurrentPasswordError'.
  it("rechaza el cambio si la contraseña actual es incorrecta", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 1,
      email: "old@example.com",
      passwordHash: "hashed-password",
      role: "CLIENT",
      isVerified: true,
    });

    vi.mocked(passwordHasher.compare).mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "wrong-password",
        newEmail: "new@example.com",
      }),
    ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);

    expect(passwordHasher.compare).toHaveBeenCalledWith(
      "wrong-password",
      "hashed-password",
    );

    expect(changeEmailRepository.changeEmail).not.toHaveBeenCalled();
    expect(
      verificationMailer.sendVerificationEmail,
    ).not.toHaveBeenCalled();
  });

  /// Verifica el flujo exitoso: persiste la solicitud en el repositorio y envía el token intacto mediante el servicio de correo.
  it("cambia el correo y envía el token de verificación sin modificarlo", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 1,
      email: "old@example.com",
      passwordHash: "hashed-password",
      role: "CLIENT",
      isVerified: true,
    });

    vi.mocked(passwordHasher.compare).mockResolvedValue(true);

    vi.mocked(changeEmailRepository.changeEmail).mockResolvedValue({
      email: "new@example.com",
      verificationToken: "plain-verification-token",
    });

    vi.mocked(
      verificationMailer.sendVerificationEmail,
    ).mockResolvedValue(undefined);

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "correct-password",
      newEmail: "new@example.com",
    });

    expect(changeEmailRepository.changeEmail).toHaveBeenCalledWith(
      1,
      "new@example.com",
      expect.any(Date),
    );

    expect(
      verificationMailer.sendVerificationEmail,
    ).toHaveBeenCalledWith(
      "new@example.com",
      "plain-verification-token",
    );

    expect(result).toEqual({
      email: "new@example.com",
      isVerified: false,
    });
  });

  /// Confirma que si la base de datos o repositorio arroja un fallo, la operación se aborta sin enviar el correo.
  it("no envía el correo si el cambio de email falla", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 1,
      email: "old@example.com",
      passwordHash: "hashed-password",
      role: "CLIENT",
      isVerified: true,
    });

    vi.mocked(passwordHasher.compare).mockResolvedValue(true);

    const repositoryError = new Error("El correo ya está en uso");

    vi.mocked(
      changeEmailRepository.changeEmail,
    ).mockRejectedValue(repositoryError);

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "correct-password",
        newEmail: "existing@example.com",
      }),
    ).rejects.toThrow(repositoryError);

    expect(
      verificationMailer.sendVerificationEmail,
    ).not.toHaveBeenCalled();
  });

  /// Verifica que ante una falla en la conexión SMTP/Mailer, el error se propague correctamente hacia el invocador del caso de uso.
  it("propaga un error del mailer después de completar el cambio", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 1,
      email: "old@example.com",
      passwordHash: "hashed-password",
      role: "CLIENT",
      isVerified: true,
    });

    vi.mocked(passwordHasher.compare).mockResolvedValue(true);

    vi.mocked(changeEmailRepository.changeEmail).mockResolvedValue({
      email: "new@example.com",
      verificationToken: "plain-verification-token",
    });

    const mailError = new Error("SMTP connection failed");

    vi.mocked(
      verificationMailer.sendVerificationEmail,
    ).mockRejectedValue(mailError);

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "correct-password",
        newEmail: "new@example.com",
      }),
    ).rejects.toThrow(mailError);

    expect(
      verificationMailer.sendVerificationEmail,
    ).toHaveBeenCalledWith(
      "new@example.com",
      "plain-verification-token",
    );
  });
});