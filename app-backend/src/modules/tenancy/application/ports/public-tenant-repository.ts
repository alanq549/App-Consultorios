/// ARCHIVO: src/modules/tenancy/application/ports/public-tenant-repository.ts
/// Contrato (interfaz) y tipos para la consulta pública y de acceso abierto de datos de un tenant.

/**
 * Representa la información pública de un tenant que puede ser consultada
 * sin requerir el contexto de una membresía de usuario específica.
 */
export type PublicTenantRecord = {
  /// Identificador único del tenant en el sistema.
  id: number;
};

/**
 * Puerto de repositorio para operaciones de lectura pública sobre la entidad Tenant.
 */
export interface PublicTenantRepository {
  /// Busca un tenant activo por su identificador único.
  /// Retorna los datos básicos del tenant si existe y está activo, o `null` en caso contrario.
  findActiveTenantById(
    tenantId: number,
  ): Promise<PublicTenantRecord | null>;
}