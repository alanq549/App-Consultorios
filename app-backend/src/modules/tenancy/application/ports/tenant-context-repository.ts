/// ARCHIVO: src/modules/tenancy/application/ports/tenant-context-repository.ts
/// Contrato (interfaz) y tipos para acceder a la información de contexto de un tenant y la membresía del usuario.

/**
 * Representa la estructura de datos consolidada del contexto de un tenant
 * y la relación (membresía) que un usuario sostiene con este.
 */
export type TenantContextRecord = {
  /// Información general y estado operativo del tenant.
  tenant: {
    id: number;
    name: string;
    slug: string;
    status: "ACTIVE" | "INACTIVE";
  };
  /// Detalles del rol y estado del usuario dentro del tenant.
  membership: {
    role: "OWNER" | "MEMBER";
    status: "ACTIVE" | "SUSPENDED";
    joinedAt: Date;
  };
};

/**
 * Puerto de repositorio para consultar el contexto y permisos de un usuario dentro de un tenant.
 */
export interface TenantContextRepository {
  /// Busca y recupera la membresía activa de un usuario dentro de un tenant específico.
  /// Retorna `null` si el usuario no pertenece al tenant o no existe la relación.
  findMembershipContext(
    userId: number,
    tenantId: number,
  ): Promise<TenantContextRecord | null>;
}