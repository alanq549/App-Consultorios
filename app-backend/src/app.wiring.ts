/// ARCHIVO: src/app.wiring.ts
/// Composition Root de aplicación — Fase 5, Misiones 1 y 2.
///
/// Único punto de la aplicación autorizado a conocer las implementaciones concretas
/// de infraestructura de TODOS los módulos y a ensamblarlas entre sí.
/// La dirección de dependencias es: Composition Root -> Módulos (mediante inyección de dependencias).
/// Ningún módulo de negocio importa directamente este archivo.
///
/// Regla: src/app.ts registra rutas, src/app.wiring.ts ensambla dependencias.

import {
  PrismaActiveAffiliationChecker,
  PrismaProfilesEligibilityService,
} from "@/modules/profiles";
import { createCatalogCompositionRoot } from "@/modules/catalog/catalog.wiring";
import { createSpecialtyRouter } from "@/modules/catalog/http/specialty.routes";
import { CatalogTaxonomyService } from "@/modules/catalog/infrastructure/catalog-taxonomy.service";
import type { CatalogTaxonomyContract } from "@/modules/catalog";
import type { ProfileSuspensionPort } from "@/modules/catalog/application/ports/profile-suspension.port";
import type { ProfessionalProfilePort } from "@/modules/catalog/application/ports/professional-profile-lookup.port";
import type { CatalogNotificationPort } from "@/modules/catalog/application/ports/catalog-notification.port";
import { NotificationService } from "@/modules/notifications/notifications.service";

import { createAdminRouter } from "@/modules/admin/admin.routes";
import { createProfessionalProfileRouter } from "@/modules/users/professionalprofile/professionalprofile.routes";
import { AuthService } from "@/modules/auth/auth.service";
import { ServiceService } from "@/modules/services/service.service";

// ── 1. Infraestructura de Profiles consumida por Catalog ─────────────────────
const affiliationChecker = new PrismaActiveAffiliationChecker();
const profilesEligibilityService = new PrismaProfilesEligibilityService();

// Adaptador: ProfileSuspensionPort -> Profiles
// Se propaga el TransactionContext sellado; la extracción del cliente transaccional
// la realiza Profiles, que exige contexto activo (sin fallback al cliente global).
const profileSuspensionAdapter: ProfileSuspensionPort = {
  async suspendIfNoApprovedSpecialties(professionalId, tx) {
    return profilesEligibilityService.suspendOnSpecialtyRevoked(professionalId, tx);
  },
};

// Adaptador: ProfessionalProfilePort -> Profiles (Lookup y Row-level Lock FOR UPDATE)
const professionalProfileAdapter: ProfessionalProfilePort = {
  async findProfileIdByUserId(userId, tx) {
    return profilesEligibilityService.findProfileIdByUserId(userId, tx);
  },
  async lockProfileForUpdate(profileId, tx) {
    await profilesEligibilityService.lockProfileForUpdate(profileId, tx);
  },
};

// Adaptador: CatalogNotificationPort -> NotificationsService
const catalogNotificationsAdapter: CatalogNotificationPort = {
  async notifySpecialtyRequested(professionalId) {
    await NotificationService.notifySpecialtyRequested(professionalId);
  },
  async notifySpecialtyApproved(professionalId) {
    await NotificationService.notifySpecialtyApproved(professionalId);
  },
  async notifySpecialtyRejected(professionalId) {
    await NotificationService.notifySpecialtyRejected(professionalId);
  },
  async notifyProfileSuspended(professionalId) {
    await NotificationService.notifyProfileSuspended(professionalId);
  },
};

// ── 2. Ensamblado del Bounded Context Catalog ────────────────────────────────
export const catalogContainer = createCatalogCompositionRoot({
  affiliationChecker,
  profileSuspension: profileSuspensionAdapter,
  professionalProfilePort: professionalProfileAdapter,
  notifications: catalogNotificationsAdapter,
});

export const {
  specialtyController,
  professionalSpecialtyController,
  professionalSpecialtyRouter,
} = catalogContainer;

/** Router canónico de especialidades para app.ts. */
export const specialtyRouter = createSpecialtyRouter(specialtyController);

/** Servicio de taxonomía de catálogo ensamblado para consumo inter-módulos. */
export const catalogTaxonomyService: CatalogTaxonomyContract =
  new CatalogTaxonomyService(catalogContainer.specialtyRepo);

// ── 3. Ensamblado de routers de módulos consumidores de Catalog ───────────────
export const adminRouter = createAdminRouter({
  professionalSpecialtyController,
});

export const professionalProfileRouter = createProfessionalProfileRouter({
  professionalSpecialtyController,
});

// ── 4. Inyección de dependencias desde Composition Root hacia módulos de negocio
AuthService.injectDependencies({ catalogTaxonomy: catalogTaxonomyService });
ServiceService.injectDependencies({
  catalogTaxonomy: catalogTaxonomyService,
  affiliationChecker,
});
