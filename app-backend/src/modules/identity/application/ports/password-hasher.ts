/// ARCHIVO: src/modules/identity/application/ports/password-hasher.ts
/// Puerto que define las operaciones para la encriptación y verificación de contraseñas.

export interface PasswordHasher {
  compare(plain: string, hashed: string): Promise<boolean>;
  hash(plain: string): Promise<string>;
}