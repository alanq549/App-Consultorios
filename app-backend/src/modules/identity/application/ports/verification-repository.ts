/// ARCHIVO: src/modules/identity/application/ports/verification-repository.ts
/// Puerto del repositorio de verificación para definir las operaciones necesarias de persistencia del proceso de verificación.

/// Representa el estado condensado de la cuenta de usuario tras una verificación exitosa.
export interface VerifiedAccount {
  id: number;
  email: string;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
  isVerified: boolean;
}

/// Contrato que deben implementar los adaptadores de infraestructura para gestionar la verificación de correo.
export interface VerificationRepository {
  /// Valida y consume de forma atómica un token de verificación, marcando al usuario como verificado.
  verifyEmail(
    tokenHash: string,
    now: Date
  ): Promise<VerifiedAccount | null>;
}