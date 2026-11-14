/// ARCHIVO: src/app.wiring.ts
/// Composition Root de aplicación — Fase 5, Misión 1.
///
/// Único punto de la aplicación autorizado a conocer las implementaciones concretas
/// de infraestructura de TODOS los módulos y a ensamblarlas entre sí.
/// La dirección de dependencias es: Composition Root -> Módulos (mediante inyección de dependencias).
/// Ningún módulo de negocio importa directamente este archivo.
///
/// Regla: src/app.ts registra rutas, src/app.wiring.ts ensambla dependencias.

import { PrismaActiveAffiliationChecker } from "@/modules/profiles";
import { createCatalogCompositionRoot } from "@/modules/catalog/catalog.wiring";
import { createSpecialtyRouter } from "@/modules/catalog/http/specialty.routes";
import { CatalogTaxonomyService } from "@/modules/catalog/infrastructure/catalog-taxonomy.service";
import type { CatalogTaxonomyContract } from "@/modules/catalog";
import { AuthService } from "@/modules/auth/auth.service";
import { ServiceService } from "@/modules/services/service.service";

// ── Infraestructura compartida entre módulos ────────────────────────────────
const affiliationChecker = new PrismaActiveAffiliationChecker();

// ── Catalog ─────────────────────────────────────────────────────────────────
export const catalogContainer = createCatalogCompositionRoot({
  affiliationChecker,
});

export const { specialtyController } = catalogContainer;

/** Router de especialidades, listo para registrar en app.ts. */
export const specialtyRouter = createSpecialtyRouter(specialtyController);

/** Servicio de taxonomía de catálogo ensamblado para consumo inter-módulos. */
export const catalogTaxonomyService: CatalogTaxonomyContract =
  new CatalogTaxonomyService(catalogContainer.specialtyRepo);

// ── Inyección de dependencias desde Composition Root hacia módulos de negocio
AuthService.injectDependencies({ catalogTaxonomy: catalogTaxonomyService });
ServiceService.injectDependencies({
  catalogTaxonomy: catalogTaxonomyService,
  affiliationChecker,
});
