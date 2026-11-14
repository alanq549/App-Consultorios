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
import { ActiveAffiliationCheckerPort } from "./application/ports/active-affiliation-checker.port";
import { ProfileSuspensionPort } from "./application/ports/profile-suspension.port";
import { ProfessionalProfilePort } from "./application/ports/professional-profile-lookup.port";
import { CatalogNotificationPort } from "./application/ports/catalog-notification.port";
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

import { ProfessionalSpecialtyController } from "./http/professional-specialty.controller";
import { SpecialtyController } from "./http/specialty.controller";
import { createProfessionalSpecialtyRouter } from "./http/professional-specialty.routes";

export interface CatalogDependencies {
  /** Implementación del port de verificación de afiliación activa (Profiles). */
  affiliationChecker: ActiveAffiliationCheckerPort;
  /** Adaptador de reconciliación/suspensión con Profiles. */
  profileSuspension: ProfileSuspensionPort;
  /** Adaptador para consultar y bloquear ProfessionalProfile de Profiles. */
  professionalProfilePort: ProfessionalProfilePort;
  /** Adaptador para notificaciones de Catalog. */
  notifications: CatalogNotificationPort;
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

  return {
    specialtyRepo,
    professionalSpecialtyRepo,
    specialtyController,
    professionalSpecialtyController,
    professionalSpecialtyRouter,
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
    },
  };
}
