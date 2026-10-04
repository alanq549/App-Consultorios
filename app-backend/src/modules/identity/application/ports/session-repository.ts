/// ARCHIVO: src/modules/identity/application/ports/session-repository.ts
/// Entidad de sesión (refresh token) y puerto para gestionar su persistencia en la base de datos.

export interface Session {
    id: number;  /// Identificador único de la sesión.
    userId: number;  /// ID del usuario propietario de la sesión.
    token: string;  /// Token opaco de refresco generado para renovar el acceso.
    expiresAt: Date;  /// Fecha y hora exactas de expiración de la sesión.
}

export interface SessionRepository {
    /// Crea y almacena una nueva sesión/refresh token para un usuario específico.
    createSession(userId: number): Promise<Session>;
}