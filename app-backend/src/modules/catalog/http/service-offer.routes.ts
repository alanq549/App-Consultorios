/// ARCHIVO: src/modules/catalog/http/service-offer.routes.ts
/// Enrutador de ofertas reservables montado en `/api/services` (Catalog, Misión 4).
///
/// Todas las operaciones requieren el contexto de tenant (`X-Tenant-ID`): el catálogo público lo
/// usa para derivar el alcance y las escrituras lo usan para la autorización D4.

import { Router } from "express";
import { ServiceOfferController } from "./service-offer.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";

export function createServiceOfferRouter(
  controller: ServiceOfferController,
): Router {
  const router = Router();

  // Lectura pública del catálogo de un profesional en el tenant seleccionado.
  router.get(
    "/professional/:profileId",
    resolvePublicTenantMiddleware(),
    controller.listByProfessional,
  );

  // Escrituras exclusivas del profesional titular (D4).
  router.post(
    "/",
    authMiddleware,
    requireRole("PROFESSIONAL"),
    resolvePublicTenantMiddleware(),
    controller.create,
  );

  router.patch(
    "/:id",
    authMiddleware,
    requireRole("PROFESSIONAL"),
    resolvePublicTenantMiddleware(),
    controller.update,
  );

  router.delete(
    "/:id",
    authMiddleware,
    requireRole("PROFESSIONAL"),
    resolvePublicTenantMiddleware(),
    controller.remove,
  );

  return router;
}
