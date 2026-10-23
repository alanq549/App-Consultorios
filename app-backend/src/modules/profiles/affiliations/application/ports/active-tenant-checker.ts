/// ARCHIVO: src/modules/profiles/affiliations/application/ports/active-tenant-checker.ts
/// Puerto para verificar la existencia y estado activo de un consultorio/tenant.

export interface ActiveTenantChecker {
  /**
   * Determina si un tenant existe y se encuentra en estado ACTIVE.
   *
   * @param tenantId - ID del tenant a consultar.
   * @returns true si el tenant existe y su status es ACTIVE; false en caso contrario.
   */
  isActiveTenant(tenantId: number): Promise<boolean>;
}
