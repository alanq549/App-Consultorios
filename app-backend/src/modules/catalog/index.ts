/// ARCHIVO: src/modules/catalog/index.ts
/// Frontera pública del contexto Catalog (Misión 1 - Fase 5).
/// Los módulos externos consumen contratos, DTOs y errores de dominio desde este punto de entrada.
/// No exporta adaptadores ni instancias de infraestructura; el ensamblado se gestiona en el wiring de aplicación.

export type {
  CatalogTaxonomyContract,
  TaxonomySpecialtyDTO,
} from "./application/ports/catalog-taxonomy.contract";

export type {
  SpecialtyRepository,
} from "./domain/repositories/specialty.repository";

export {
  CatalogDomainError,
  SpecialtyNotFoundError,
  DuplicateSpecialtyError,
  SpecialtyInactiveError,
  InvalidSpecialtyDataError,
  UnauthorizedSpecialtyOperationError,
} from "./domain/catalog-errors";

export {
  CreateSpecialtyDTO,
  CreateSpecialtySchema,
  UpdateSpecialtyDTO,
  UpdateSpecialtySchema,
  SpecialtyResponseDTO,
} from "./application/dto/specialty.dto";
