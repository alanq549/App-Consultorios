/// ARCHIVO: src/modules/identity/domain/account.ts
/// Entidad de dominio que representa la cuenta de usuario en el sistema de identidad.

export interface UserAccount {
  id: number;   /// Identificador único de la cuenta.
  email: string;  /// Correo electrónico asociado a la cuenta.
  passwordHash: string;  /// Contraseña encriptada (hash), nunca en texto plano.
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";  /// Rol asignado a la cuenta dentro del sistema.
  isVerified: boolean;  /// Indica si el correo electrónico de la cuenta ha sido verificado.
}