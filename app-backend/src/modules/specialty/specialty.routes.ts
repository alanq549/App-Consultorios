// src/modules/specialty/specialty.routes.ts
import { Router } from "express";
import { SpecialtyController } from "./specialty.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";

const router = Router();

router.get("/", SpecialtyController.list);

// Proyección pública de un profesional: requiere X-Tenant-ID y sólo responde si el profesional
// mantiene una afiliación activa en ese tenant.
router.get(
  "/professional/:profileId",
  resolvePublicTenantMiddleware(),
  SpecialtyController.listByProfessional,
);

router.get(
  "/soft-deleted",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.list_soft_delete,
);

router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.create,
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.update,
);

router.patch(
  "/:id/restore",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.restore
);


router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.remove,
);

export default router;
