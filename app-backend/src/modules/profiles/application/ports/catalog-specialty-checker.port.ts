/// ARCHIVO: src/modules/profiles/application/ports/catalog-specialty-checker.port.ts

export interface CatalogSpecialtyChecker {
  countApprovedSpecialties(professionalId: number, txClient?: unknown): Promise<number>;
}

