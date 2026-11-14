/// ARCHIVO: src/modules/catalog/application/ports/active-affiliation-checker.port.ts
/// Puerto para validar pertenencia del profesional a un tenant mediante afiliación activa.

export interface ActiveAffiliationCheckerPort {
  hasActiveAffiliation(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<boolean>;

  /// Resuelve el ID de la afiliación ACTIVE del profesional en el tenant (o `null`).
  /// Permite acotar las ofertas a la afiliación exacta (D3) en las superficies públicas.
  findActiveAffiliationId(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<number | null>;
}

