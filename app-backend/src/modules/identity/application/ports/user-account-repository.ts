/// ARCHIVO: src/modules/identity/application/ports/user-account-repository.ts
/// Puerto que define las operaciones de lectura/escritura de cuentas de usuario en la base de datos.

import type { UserAccount } from "../../domain/account";

export interface UserAccountRepository {
  /// Busca y retorna una cuenta por su correo electrónico, o null si no existe.
  findByEmail(email: string): Promise<UserAccount | null>;
}