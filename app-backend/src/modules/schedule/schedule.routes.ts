// src/modules/schedule/schedule.routes.ts
import { Router } from "express";
import { ScheduleController } from "./schedule.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";

const router = Router();

// Público (cliente). Requiere X-Tenant-ID: la agenda de un profesional sólo se expone en los
// tenants donde mantiene una afiliación activa.
router.get(
  "/professional/:profileId",
  resolvePublicTenantMiddleware(),
  ScheduleController.listByProfessional
);

// Profesional
router.post(
  "/",
  authMiddleware,
  requireRole("PROFESSIONAL"),
  ScheduleController.create
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("PROFESSIONAL"),
  ScheduleController.update
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("PROFESSIONAL"),
  ScheduleController.remove
);

export default router;
