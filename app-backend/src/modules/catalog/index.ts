/// ARCHIVO: src/modules/catalog/index.ts
/// Frontera pública del contexto Catalog (Fase 5 - Misiones 1 y 2).
/// Los módulos externos consumen contratos, DTOs y errores de dominio desde este punto de entrada.
/// No exporta adaptadores ni instancias de infraestructura; el ensamblado se gestiona en el wiring de aplicación.

export type {
  CatalogTaxonomyContract,
  TaxonomySpecialtyDTO,
} from "./application/ports/catalog-taxonomy.contract";

export type {
  SpecialtyRepository,
} from "./domain/repositories/specialty.repository";

export type {
  ProfessionalSpecialtyRepository,
} from "./domain/repositories/professional-specialty.repository";

export type {
  ProfileSuspensionPort,
} from "./application/ports/profile-suspension.port";

export type {
  ProfessionalProfilePort,
} from "./application/ports/professional-profile-lookup.port";

export type {
  CatalogNotificationPort,
} from "./application/ports/catalog-notification.port";

export {
  CatalogDomainError,
  SpecialtyNotFoundError,
  DuplicateSpecialtyError,
  SpecialtyInactiveError,
  InvalidSpecialtyDataError,
  UnauthorizedSpecialtyOperationError,
  ProfessionalSpecialtyNotFoundError,
  ProfessionalSpecialtyAlreadyExistsError,
  MaxPendingSpecialtiesExceededError,
  InvalidSpecialtyStatusError,
  ProfessionalProfileNotFoundError,
} from "./domain/catalog-errors";

export {
  ProfessionalSpecialty,
  ProfessionalSpecialtyStatus,
} from "./domain/professional-specialty.entity";

export {
  CreateSpecialtyDTO,
  CreateSpecialtySchema,
  UpdateSpecialtyDTO,
  UpdateSpecialtySchema,
  SpecialtyResponseDTO,
} from "./application/dto/specialty.dto";

export {
  RequestProfessionalSpecialtyInput,
  ReviewProfessionalSpecialtyInput,
  ProfessionalSpecialtyResponseDTO,
} from "./application/dto/professional-specialty.dto";

export { RequestProfessionalSpecialtyUseCase } from "./application/use-cases/request-professional-specialty.use-case";
export { ReviewProfessionalSpecialtyUseCase } from "./application/use-cases/review-professional-specialty.use-case";
export { ProfessionalSpecialtyController } from "./http/professional-specialty.controller";
export { createProfessionalSpecialtyRouter } from "./http/professional-specialty.routes";
