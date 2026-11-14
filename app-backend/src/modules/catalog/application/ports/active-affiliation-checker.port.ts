/// ARCHIVO: src/modules/catalog/application/ports/active-affiliation-checker.port.ts
/// Puerto para validar pertenencia del profesional a un tenant mediante afiliación activa.

export interface ActiveAffiliationCheckerPort {
  hasActiveAffiliation(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<boolean>;
}

