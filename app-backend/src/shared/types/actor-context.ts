/// ARCHIVO: src/shared/types/actor-context.ts
/// Define el contrato de identidad estándar para cualquier usuario dentro del sistema.

export interface ActorContext {
  /// ID único del usuario en la base de datos.
  id: number;

  /// Nivel de acceso permitido en la plataforma.
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
}