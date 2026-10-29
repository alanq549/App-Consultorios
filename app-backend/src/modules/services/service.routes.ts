// src/modules/service/service.routes.ts
import { Router } from "express";
import { ServiceController } from "./service.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";

const router = Router();

// Público (cliente). Requiere X-Tenant-ID: el catálogo de un profesional sólo se expone en los
// tenants donde mantiene una afiliación activa.
router.get(
  "/professional/:profileId",
  resolvePublicTenantMiddleware(),
  ServiceController.listByProfessional
);

// Profesional
router.post(
  "/",
  authMiddleware,
  requireRole("PROFESSIONAL"),
  ServiceController.create
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole("PROFESSIONAL"),
  ServiceController.update
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("PROFESSIONAL"),
  ServiceController.remove
);

export default router;
