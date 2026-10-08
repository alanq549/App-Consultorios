/// ARCHIVO: src/modules/identity/application/use-cases/change-password.use-case.ts
/// Caso de uso para cambiar la contraseña de un usuario autenticado mediante la verificación de la contraseña actual.

import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";
import type { PasswordChangeRepository } from "@/modules/identity/application/ports/password-change-repository";
import type { UserAccountRepository } from "@/modules/identity/application/ports/user-account-repository";
import {
  InvalidCurrentPasswordError,
  UserAccountNotFoundError,
} from "@/modules/identity/domain/identity-errors";

/// Define los datos requeridos para ejecutar la solicitud de cambio de contraseña.
export interface ChangePasswordInput {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

/// Define la estructura del resultado tras un cambio de contraseña exitoso.
export interface ChangePasswordResult {
  message: string;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserAccountRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordChangeRepository: PasswordChangeRepository
  ) {}

  /// Ejecuta el cambio de contraseña: verifica la identidad del usuario, valida la contraseña actual y persiste la nueva.
  async execute(
    data: ChangePasswordInput
  ): Promise<ChangePasswordResult> {
    // Busca al usuario en el repositorio mediante su ID
    const user = await this.userRepository.findById(data.userId);

    // Lanza una excepción si el usuario no existe en la base de datos
    if (!user) {
      throw new UserAccountNotFoundError();
    }

    // Compara la contraseña actual proporcionada con el hash almacenado
    const passwordValid = await this.passwordHasher.compare(
      data.currentPassword,
      user.passwordHash
    );

    // Lanza una excepción si la contraseña actual no coincide
    if (!passwordValid) {
      throw new InvalidCurrentPasswordError();
    }

    // Genera el hash para la nueva contraseña
    const passwordHash = await this.passwordHasher.hash(
      data.newPassword
    );

    // Actualiza la contraseña en la base de datos e invalida las sesiones existentes
    await this.passwordChangeRepository.changePassword(
      user.id,
      passwordHash
    );

    // Retorna el mensaje de confirmación exitosa
    return {
      message: "Contraseña actualizada",
    };
  }
}