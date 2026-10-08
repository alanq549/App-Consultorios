/// ARCHIVO: src/modules/identity/application/ports/password-change-repository.ts
/// Puerto que define la operación para la actualización de la contraseña del usuario.

export interface PasswordChangeRepository {
  changePassword(
    userId: number,
    passwordHash: string
  ): Promise<void>;
}