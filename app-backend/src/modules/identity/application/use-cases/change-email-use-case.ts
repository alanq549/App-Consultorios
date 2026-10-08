/// ARCHIVO: src/modules/identity/application/use-cases/change-email-use-case.ts
/// Caso de uso para cambiar el correo electrónico de un usuario previa validación de su contraseña actual y envío de correo de verificación.

import type { ChangeEmailRepository } from "@/modules/identity/application/ports/change-email-repository";
import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import type { VerificationMailer } from "@/modules/identity/application/ports/verification-mailer";
import {
  InvalidCurrentPasswordError,
  UserAccountNotFoundError,
} from "@/modules/identity/domain/identity-errors";

/// Define los datos requeridos para solicitar el cambio de correo electrónico.
export interface ChangeEmailInput {
  userId: number;
  currentPassword: string;
  newEmail: string;
}

/// Define la estructura del resultado tras solicitar el cambio de correo electrónico.
export interface ChangeEmailResult {
  email: string;
  isVerified: boolean;
}

export class ChangeEmailUseCase {
  constructor(
    private readonly userRepository: UserAccountRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly changeEmailRepository: ChangeEmailRepository,
    private readonly verificationMailer: VerificationMailer
  ) {}

  /// Ejecuta el cambio de correo: valida la existencia del usuario, verifica su contraseña, aplica el cambio y envía el correo de confirmación.
  async execute(
    data: ChangeEmailInput
  ): Promise<ChangeEmailResult> {
    // Busca al usuario en el repositorio mediante su ID
    const user = await this.userRepository.findById(data.userId);

    // Lanza una excepción si el usuario no existe en la base de datos
    if (!user) {
      throw new UserAccountNotFoundError();
    }

    // Compara la contraseña actual ingresada con el hash almacenado
    const passwordValid = await this.passwordHasher.compare(
      data.currentPassword,
      user.passwordHash
    );

    // Lanza una excepción si la contraseña actual no es correcta
    if (!passwordValid) {
      throw new InvalidCurrentPasswordError();
    }

    // Ejecuta el cambio de correo en el repositorio y obtiene el nuevo token de verificación generado
    const result = await this.changeEmailRepository.changeEmail(
      user.id,
      data.newEmail,
      new Date()
    );

    // Envía el correo de verificación con el nuevo token generado
    await this.verificationMailer.sendVerificationEmail(
      result.email,
      result.verificationToken
    );

    // Retorna la confirmación del nuevo correo y su estado inicial sin verificar
    return {
      email: result.email,
      isVerified: false,
    };
  }
}