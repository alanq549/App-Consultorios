/// ARCHIVO: src/modules/profiles/affiliations/application/ports/active-affiliation-checker.ts
/// Puerto para verificar la afiliación activa de un perfil profesional dentro de un tenant.
///
/// Propósito: permitir que las superficies operativas (catálogo, agenda, citas) deriven su
/// alcance multi-tenant sin denormalizar `tenantId` en sus tablas. Un recurso operativo es
/// visible en un tenant sólo si el perfil profesional al que pertenece mantiene una afiliación
/// ACTIVE en ese tenant, y ese tenant está ACTIVE. La fuente de verdad de la pertenencia es
/// `ProfessionalTenantAffiliation`, ya utilizada por el directorio público (Slice A).

export interface ActiveAffiliationChecker {
  /**
   * Determina si un perfil profesional pertenece (afiliación ACTIVE) a un tenant activo.
   *
   * @param professionalProfileId - ID del perfil profesional cuyo alcance se consulta.
   * @param tenantId - ID del tenant en cuyo contexto se evalúa la visibilidad.
   * @returns true sólo si existe una `ProfessionalTenantAffiliation` con status ACTIVE cuyo
   *          tenant está ACTIVE; false en cualquier otro caso.
   */
  hasActiveAffiliation(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<boolean>;

  /**
   * Resuelve el ID de la afiliación ACTIVE del profesional en un tenant activo.
   *
   * @returns El `id` de la `ProfessionalTenantAffiliation` ACTIVE, o `null` si el profesional no
   *          tiene una afiliación activa en ese tenant.
   */
  findActiveAffiliationId(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<number | null>;
}
