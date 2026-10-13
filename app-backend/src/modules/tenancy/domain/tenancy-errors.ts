/// ARCHIVO: src/modules/tenancy/domain/tenancy-errors.ts
/// Excepciones y errores de dominio específicos del módulo de tenancy.
///
/// Propósito: Definir errores fuertemente tipados que representan fallos
/// en las reglas de negocio de multitenencia (por ejemplo, accesos no autorizados
/// o contextos de tenant inactivos/inexistentes).

/**
 * Excepción lanzada cuando el contexto de un tenant no está disponible,
 * el tenant no existe, o el usuario no tiene permisos/membresía activa para acceder a él.
 */
export class TenantContextUnavailableError extends Error {
  constructor() {
    super("Tenant context unavailable or access denied");
    this.name = "TenantContextUnavailableError";
  }
}