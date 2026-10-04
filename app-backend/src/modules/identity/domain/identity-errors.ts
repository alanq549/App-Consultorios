/// ARCHIVO: src/modules/identity/domain/identity-errors.ts
/// Errores específicos del dominio de identidad para representar fallos en reglas de negocio de autenticación.

/// Error lanzado cuando el usuario proporciona credenciales de acceso incorrectas.
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Credenciales inválidas");
    this.name = "InvalidCredentialsError";
  }
}

/// Error lanzado cuando un token de verificación es inválido, ha sido alterado o ha expirado.
export class InvalidVerificationTokenError extends Error {
  constructor() {
    super("Token inválido o expirado");
    this.name = "InvalidVerificationTokenError";
  }
}

/// Error lanzado cuando se intenta verificar una cuenta que ya completó su proceso de verificación previamente.
export class AlreadyVerifiedError extends Error {
  constructor() {
    super("La cuenta ya está verificada");
    this.name = "AlreadyVerifiedError";
  }
}