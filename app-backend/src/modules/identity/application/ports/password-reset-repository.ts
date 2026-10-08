/// ARCHIVO: src/modules/identity/application/ports/password-reset-repository.ts
/// Puerto del repositorio de restablecimiento de contraseña para definir el contrato de persistencia de tokens de recuperación.

/// Entidad de dominio que representa una solicitud de restablecimiento de contraseña.
export interface PasswordReset {
    id: number;
    userId: number;
    token: string;
    expiresAt: Date;
    isUsed: boolean;
}

/// Contrato que deben implementar los adaptadores de infraestructura para gestionar la recuperación de contraseñas.
export interface PasswordResetRepository {
    /// Registra una nueva solicitud de restablecimiento de contraseña guardando el hash del token y su fecha de expiración.
    create(
        userId: number,
        tokenHash: string,
        expiresAt: Date
    ): Promise<PasswordReset>;

    /// Busca una solicitud de restablecimiento válida utilizando el hash del token y la fecha/hora actual.
    findValidByToken(
        tokenHash: string,
        now: Date
    ): Promise<PasswordReset | null>;

    /// Marca una solicitud de restablecimiento como utilizada para evitar su reutilización.
    resetPassword(
        tokenHash: string,
        passwordHash: string,
        now: Date
    ): Promise<boolean>;
}