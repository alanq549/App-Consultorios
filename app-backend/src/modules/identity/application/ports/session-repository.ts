/// ARCHIVO: src/modules/identity/application/ports/session-repository.ts
/// Contrato para la gestión de sesiones/refresh tokens.

export interface Session {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
}

export interface SessionActor {
  id: number;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
}

export interface RotatedSession {
  session: Session;
  actor: SessionActor;
}

export interface SessionRepository {
  /// Crea una nueva sesión/refresh token para un usuario.
  createSession(userId: number): Promise<Session>;

  /// Consume atómicamente el refresh token actual y crea uno nuevo.
  ///
  /// Devuelve null si el token no existe, está revocado o expiró.
  rotateSession(
    tokenHash: string,
    now: Date
  ): Promise<RotatedSession | null>;
}