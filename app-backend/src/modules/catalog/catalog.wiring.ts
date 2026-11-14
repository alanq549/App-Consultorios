/// ARCHIVO: src/modules/catalog/catalog.wiring.ts
/// Composition Root del contexto Catalog (Misión 1 - Fase 5).
/// Conecta adaptadores de persistencia internos con los casos de uso e inyecta
/// las dependencias al controlador HTTP.
///
/// El port de afiliación (ActiveAffiliationCheckerPort) se recibe como parámetro externo:
/// la implementación concreta es responsabilidad del composition root de aplicación (app.wiring.ts),
/// que pertenece a ningún módulo de dominio y puede importar infraestructura de cualquier contexto.

import { PrismaSpecialtyRepository } from "./infrastructure/prisma/prisma-specialty-repository";
import { PrismaProfessionalPublicSpecialtyQuery } from "./infrastructure/prisma/prisma-professional-public-specialty-query";
import { ActiveAffiliationCheckerPort } from "./application/ports/active-affiliation-checker.port";
import { CreateSpecialtyUseCase } from "./application/use-cases/create-specialty.use-case";
import { ListActiveSpecialtiesUseCase } from "./application/use-cases/list-active-specialties.use-case";
import { ListInactiveSpecialtiesUseCase } from "./application/use-cases/list-inactive-specialties.use-case";
import { UpdateSpecialtyUseCase } from "./application/use-cases/update-specialty.use-case";
import { DeactivateSpecialtyUseCase } from "./application/use-cases/deactivate-specialty.use-case";
import { RestoreSpecialtyUseCase } from "./application/use-cases/restore-specialty.use-case";
import { GetSpecialtyByIdUseCase } from "./application/use-cases/get-specialty-by-id.use-case";
import { ListProfessionalPublicSpecialtiesUseCase } from "./application/use-cases/list-professional-public-specialties.use-case";
import { SpecialtyController } from "./http/specialty.controller";

export interface CatalogDependencies {
  /** Implementación del port de verificación de afiliación activa, provista externamente. */
  affiliationChecker: ActiveAffiliationCheckerPort;
}

export function createCatalogCompositionRoot(deps: CatalogDependencies) {
  const specialtyRepo = new PrismaSpecialtyRepository();
  const professionalSpecialtyQuery = new PrismaProfessionalPublicSpecialtyQuery();

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
      professionalSpecialtyQuery,
    );

  const specialtyController = new SpecialtyController({
    createSpecialtyUseCase,
    listActiveSpecialtiesUseCase,
    listInactiveSpecialtiesUseCase,
    updateSpecialtyUseCase,
    deactivateSpecialtyUseCase,
    restoreSpecialtyUseCase,
    listProfessionalPublicSpecialtiesUseCase,
  });

  return {
    specialtyRepo,
    specialtyController,
    useCases: {
      createSpecialtyUseCase,
      listActiveSpecialtiesUseCase,
      listInactiveSpecialtiesUseCase,
      updateSpecialtyUseCase,
      deactivateSpecialtyUseCase,
      restoreSpecialtyUseCase,
      getSpecialtyByIdUseCase,
      listProfessionalPublicSpecialtiesUseCase,
    },
  };
}
