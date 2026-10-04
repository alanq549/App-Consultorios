/// ARCHIVO: src/modules/identity/infrastructure/bcrypt-password-hasher.ts
/// Implementación de PasswordHasher utilizando la librería Bcrypt para verificar contraseñas.

import bcrypt from "bcrypt";
import type { PasswordHasher } from "@/modules/identity/application/ports/password-hasher";

export class BcryptPasswordHasher implements PasswordHasher {
  /// Compara una contraseña en texto plano con el hash almacenado para verificar su validez.
  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}