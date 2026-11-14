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
  UnauthorizedAffiliationActionError,
  ServiceOfferNotFoundError,
  ServiceOfferNameAlreadyExistsError,
  InvalidServiceOfferDataError,
  ServiceImmutableTermsWithAppointmentsError,
  ServiceHasPendingAppointmentsError,
} from "./domain/catalog-errors";

export {
  ServiceOffer,
  OFFER_SLOT_MINUTES,
  OFFER_MAX_DURATION_MIN,
} from "./domain/offer/service-offer.entity";

export type {
  ServiceOfferRepository,
  CreateServiceOfferData,
  UpdateServiceOfferData,
} from "./domain/repositories/service-offer.repository";

export type {
  OfferWriteContext,
  OfferWriteContextPort,
} from "./application/ports/offer-write-context.port";

export type { OfferAppointmentPolicyPort } from "./application/ports/offer-appointment-policy.port";

export {
  BOOKABLE_SERVICE_CURRENCY,
} from "./application/ports/catalog-reader.port";

export type {
  CatalogReader,
  BookableService,
} from "./application/ports/catalog-reader.port";

export {
  CreateServiceOfferSchema,
  UpdateServiceOfferSchema,
  toServiceOfferResponseDTO,
} from "./application/dto/service-offer.dto";

export type {
  CreateServiceOfferDTO,
  UpdateServiceOfferDTO,
  ServiceOfferResponseDTO,
} from "./application/dto/service-offer.dto";

export { CreateServiceOfferUseCase } from "./application/use-cases/create-service-offer.use-case";
export { UpdateServiceOfferUseCase } from "./application/use-cases/update-service-offer.use-case";
export { DeactivateServiceOfferUseCase } from "./application/use-cases/deactivate-service-offer.use-case";
export { ListProfessionalPublicOffersUseCase } from "./application/use-cases/list-professional-public-offers.use-case";
export { ServiceOfferController } from "./http/service-offer.controller";
export { createServiceOfferRouter } from "./http/service-offer.routes";

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
