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

// / Error lanzado cuando un token de actualización (refresh token) es inválido o ha expirado.
export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Refresh token inválido");
    this.name = "InvalidRefreshTokenError";
  }
}

// Error lanzado cuando un token de restablecimiento de contraseña es inválido o ha expirado.
export class InvalidPasswordResetTokenError extends Error {
  constructor() {
    super("Token inválido o expirado");
    this.name = "InvalidPasswordResetTokenError";
  }
}

// Error lanzado cuando se intenta cambiar la contraseña de un usuario que no existe en el sistema.
export class UserAccountNotFoundError extends Error {
  constructor() {
    super("Usuario no existe");
    this.name = "UserAccountNotFoundError";
  }
}

// Error lanzado cuando la contraseña actual proporcionada por el usuario no coincide con la almacenada en el sistema.
export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("Contraseña actual incorrecta");
    this.name = "InvalidCurrentPasswordError";
  }
}