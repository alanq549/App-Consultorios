/// ARCHIVO: src/modules/identity/application/ports/change-email-repository.ts
/// Puerto que define las operaciones para la actualización del correo electrónico del usuario y la generación del token de verificación.

export interface ChangeEmailResult {
  email: string;
  verificationToken: string;
}

export interface ChangeEmailRepository {
  changeEmail(
    userId: number,
    newEmail: string,
    now: Date
  ): Promise<ChangeEmailResult>;
}