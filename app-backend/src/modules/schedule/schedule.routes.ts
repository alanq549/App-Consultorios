// src/modules/schedule/schedule.routes.ts
import { Router } from "express";
import { ScheduleController } from "./schedule.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";

const router = Router();

// Público (cliente)
router.get(
  "/professional/:profileId",
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
