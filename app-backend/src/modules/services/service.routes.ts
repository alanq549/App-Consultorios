// src/modules/service/service.routes.ts
import { Router } from "express";
import { ServiceController } from "./service.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";

const router = Router();

// Público (cliente)
router.get(
  "/professional/:profileId",
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
