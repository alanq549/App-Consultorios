/// ARCHIVO: src/core/errors/AppError.ts
/// Clase personalizada para manejar errores operativos controlados en la aplicación.

export class AppError extends Error {
  /// Código de estado HTTP (ej. 400, 404, 403).
  statusCode: number;

  /// Indica que es un error previsto/controlado por la aplicación.
  isOperational: boolean;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Captura el rastro de la pila (stack trace) excluyendo este constructor.
    Error.captureStackTrace(this, this.constructor);
  }
}