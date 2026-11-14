/// ARCHIVO: src/modules/catalog/http/specialty.routes.ts
/// Enrutador de Specialty. Exporta createSpecialtyRouter(controller) para permitir
/// composición desacoplada desde el wiring raíz, y un default export para compatibilidad
/// con los adaptadores legacy y el wiring de aplicación.

import { Router } from "express";
import { SpecialtyController } from "./specialty.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";

export function createSpecialtyRouter(controller: SpecialtyController): Router {
  const router = Router();

  // Lectura pública de especialidades activas (D1)
  router.get("/", controller.list);

  // Proyección pública de un profesional en un tenant (compatibilidad Fase 3)
  router.get(
    "/professional/:profileId",
    resolvePublicTenantMiddleware(),
    controller.listByProfessional,
  );

  // Lectura de especialidades desactivadas (solo ADMIN)
  router.get(
    "/soft-deleted",
    authMiddleware,
    requireRole("ADMIN"),
    controller.list_soft_delete,
  );

  router.get(
    "/inactive",
    authMiddleware,
    requireRole("ADMIN"),
    controller.list_soft_delete,
  );

  // Mutaciones de catálogo global (exclusivo ADMIN de plataforma - D1)
  router.post(
    "/",
    authMiddleware,
    requireRole("ADMIN"),
    controller.create,
  );

  router.patch(
    "/:id",
    authMiddleware,
    requireRole("ADMIN"),
    controller.update,
  );

  router.patch(
    "/:id/restore",
    authMiddleware,
    requireRole("ADMIN"),
    controller.restore,
  );

  router.delete(
    "/:id",
    authMiddleware,
    requireRole("ADMIN"),
    controller.remove,
  );

  return router;
}
