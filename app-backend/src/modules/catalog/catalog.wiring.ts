/// ARCHIVO: src/modules/catalog/catalog.wiring.ts
/// Composition Root del contexto Catalog (Fase 5 - Misiones 1 y 2).
/// Conecta adaptadores de persistencia internos con los casos de uso e inyecta
/// las dependencias al controlador HTTP.
///
/// Todas las dependencias inter-módulo (Profiles, Notifications) son requeridas
/// en CatalogDependencies y provistas exclusivamente por el wiring de aplicación (app.wiring.ts).

import { PrismaSpecialtyRepository } from "./infrastructure/prisma/prisma-specialty-repository";
import { PrismaProfessionalSpecialtyRepository } from "./infrastructure/prisma/prisma-professional-specialty-repository";
import { PrismaProfessionalPublicSpecialtyQuery } from "./infrastructure/prisma/prisma-professional-public-specialty-query";
import { PrismaServiceOfferRepository } from "./infrastructure/prisma/prisma-service-offer-repository";
import { ActiveAffiliationCheckerPort } from "./application/ports/active-affiliation-checker.port";
import { ProfileSuspensionPort } from "./application/ports/profile-suspension.port";
import { ProfessionalProfilePort } from "./application/ports/professional-profile-lookup.port";
import { CatalogNotificationPort } from "./application/ports/catalog-notification.port";
import { OfferWriteContextPort } from "./application/ports/offer-write-context.port";
import { OfferAppointmentPolicyPort } from "./application/ports/offer-appointment-policy.port";
import { PrismaTransactionRunner } from "./infrastructure/prisma/prisma-transaction-context";

import { CreateSpecialtyUseCase } from "./application/use-cases/create-specialty.use-case";
import { ListActiveSpecialtiesUseCase } from "./application/use-cases/list-active-specialties.use-case";
import { ListInactiveSpecialtiesUseCase } from "./application/use-cases/list-inactive-specialties.use-case";
import { UpdateSpecialtyUseCase } from "./application/use-cases/update-specialty.use-case";
import { DeactivateSpecialtyUseCase } from "./application/use-cases/deactivate-specialty.use-case";
import { RestoreSpecialtyUseCase } from "./application/use-cases/restore-specialty.use-case";
import { GetSpecialtyByIdUseCase } from "./application/use-cases/get-specialty-by-id.use-case";
import { ListProfessionalPublicSpecialtiesUseCase } from "./application/use-cases/list-professional-public-specialties.use-case";
import { RequestProfessionalSpecialtyUseCase } from "./application/use-cases/request-professional-specialty.use-case";
import { ReviewProfessionalSpecialtyUseCase } from "./application/use-cases/review-professional-specialty.use-case";
import { CreateServiceOfferUseCase } from "./application/use-cases/create-service-offer.use-case";
import { UpdateServiceOfferUseCase } from "./application/use-cases/update-service-offer.use-case";
import { DeactivateServiceOfferUseCase } from "./application/use-cases/deactivate-service-offer.use-case";
import { ListProfessionalPublicOffersUseCase } from "./application/use-cases/list-professional-public-offers.use-case";

import { ProfessionalSpecialtyController } from "./http/professional-specialty.controller";
import { SpecialtyController } from "./http/specialty.controller";
import { ServiceOfferController } from "./http/service-offer.controller";
import { createProfessionalSpecialtyRouter } from "./http/professional-specialty.routes";
import { createServiceOfferRouter } from "./http/service-offer.routes";

export interface CatalogDependencies {
  /** Implementación del port de verificación de afiliación activa (Profiles). */
  affiliationChecker: ActiveAffiliationCheckerPort;
  /** Adaptador de reconciliación/suspensión con Profiles. */
  profileSuspension: ProfileSuspensionPort;
  /** Adaptador para consultar y bloquear ProfessionalProfile de Profiles. */
  professionalProfilePort: ProfessionalProfilePort;
  /** Adaptador para notificaciones de Catalog. */
  notifications: CatalogNotificationPort;
  /** Adaptador de contexto de escritura (perfil, membresía y afiliación) — D4. */
  offerWriteContext: OfferWriteContextPort;
  /** Adaptador de lectura de citas para la política de inmutabilidad/desactivación — D5. */
  offerAppointmentPolicy: OfferAppointmentPolicyPort;
}

export function createCatalogCompositionRoot(deps: CatalogDependencies) {
  const specialtyRepo = new PrismaSpecialtyRepository();
  const professionalSpecialtyRepo = new PrismaProfessionalSpecialtyRepository();
  const professionalSpecialtyQuery = new PrismaProfessionalPublicSpecialtyQuery();
  const transactionRunner = new PrismaTransactionRunner();

  // Casos de uso de taxonomía (Misión 1)
  const createSpecialtyUseCase = new CreateSpecialtyUseCase(specialtyRepo);
  const listActiveSpecialtiesUseCase = new ListActiveSpecialtiesUseCase(specialtyRepo);
  const listInactiveSpecialtiesUseCase = new ListInactiveSpecialtiesUseCase(specialtyRepo);
  const updateSpecialtyUseCase = new UpdateSpecialtyUseCase(specialtyRepo);
  const deactivateSpecialtyUseCase = new DeactivateSpecialtyUseCase(specialtyRepo);
  const restoreSpecialtyUseCase = new RestoreSpecialtyUseCase(specialtyRepo);
  const getSpecialtyByIdUseCase = new GetSpecialtyByIdUseCase(specialtyRepo);
  const listProfessionalPublicSpecialtiesUseCase =
    new ListProfessionalPublicSpecialtiesUseCase(
      deps.affiliationChecker,
      professionalSpecialtyQuery
    );

  // Casos de uso de elegibilidad (Misión 2)
  const requestProfessionalSpecialtyUseCase =
    new RequestProfessionalSpecialtyUseCase(
      specialtyRepo,
      professionalSpecialtyRepo,
      deps.professionalProfilePort,
      deps.notifications,
      transactionRunner
    );

  const reviewProfessionalSpecialtyUseCase =
    new ReviewProfessionalSpecialtyUseCase(
      professionalSpecialtyRepo,
      deps.profileSuspension,
      deps.notifications,
      transactionRunner
    );

  // Casos de uso de ciclo de vida de la oferta (Misión 4)
  const serviceOfferRepo = new PrismaServiceOfferRepository();

  const createServiceOfferUseCase = new CreateServiceOfferUseCase(
    serviceOfferRepo,
    specialtyRepo,
    professionalSpecialtyRepo,
    deps.offerWriteContext,
    transactionRunner
  );

  const updateServiceOfferUseCase = new UpdateServiceOfferUseCase(
    serviceOfferRepo,
    specialtyRepo,
    professionalSpecialtyRepo,
    deps.offerWriteContext,
    deps.offerAppointmentPolicy,
    transactionRunner
  );

  const deactivateServiceOfferUseCase = new DeactivateServiceOfferUseCase(
    serviceOfferRepo,
    deps.offerWriteContext,
    deps.offerAppointmentPolicy,
    transactionRunner
  );

  const listProfessionalPublicOffersUseCase =
    new ListProfessionalPublicOffersUseCase(
      deps.affiliationChecker,
      serviceOfferRepo
    );

  // Controladores HTTP
  const specialtyController = new SpecialtyController({
    createSpecialtyUseCase,
    listActiveSpecialtiesUseCase,
    listInactiveSpecialtiesUseCase,
    updateSpecialtyUseCase,
    deactivateSpecialtyUseCase,
    restoreSpecialtyUseCase,
    listProfessionalPublicSpecialtiesUseCase,
  });

  const professionalSpecialtyController = new ProfessionalSpecialtyController(
    requestProfessionalSpecialtyUseCase,
    reviewProfessionalSpecialtyUseCase,
    deps.professionalProfilePort
  );

  const professionalSpecialtyRouter = createProfessionalSpecialtyRouter(
    professionalSpecialtyController
  );

  const serviceOfferController = new ServiceOfferController({
    createServiceOfferUseCase,
    updateServiceOfferUseCase,
    deactivateServiceOfferUseCase,
    listProfessionalPublicOffersUseCase,
  });

  const serviceOfferRouter = createServiceOfferRouter(serviceOfferController);

  return {
    specialtyRepo,
    professionalSpecialtyRepo,
    serviceOfferRepo,
    specialtyController,
    professionalSpecialtyController,
    professionalSpecialtyRouter,
    serviceOfferController,
    serviceOfferRouter,
    useCases: {
      createSpecialtyUseCase,
      listActiveSpecialtiesUseCase,
      listInactiveSpecialtiesUseCase,
      updateSpecialtyUseCase,
      deactivateSpecialtyUseCase,
      restoreSpecialtyUseCase,
      getSpecialtyByIdUseCase,
      listProfessionalPublicSpecialtiesUseCase,
      requestProfessionalSpecialtyUseCase,
      reviewProfessionalSpecialtyUseCase,
      createServiceOfferUseCase,
      updateServiceOfferUseCase,
      deactivateServiceOfferUseCase,
      listProfessionalPublicOffersUseCase,
    },
  };
}
