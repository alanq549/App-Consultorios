/// ARCHIVO: src/modules/identity/application/ports/password-hasher.ts
/// Puerto que define las operaciones para la encriptación y verificación de contraseñas.

export interface PasswordHasher {
  /// Compara una contraseña en texto plano con un hash guardado para verificar si coinciden.
    compare(plain: string, hashed: string): Promise<boolean>;

}