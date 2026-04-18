// src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.routes.ts

import { Router } from "express";
import { ProfessionalSpecialtyController } from "./professionalSpecialty.controller";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";

const router = Router();

/**
 * profesional solicita especialidad
 */
router.post(
  "/me/specialties/:specialtyId/request",
  authMiddleware,
  authorizeRole("PROFESSIONAL"),
  ProfessionalSpecialtyController.requestSpecialty
);

/**
 * admin aprueba / rechaza
 */
router.patch(
  "/:professionalId/specialties/:specialtyId/status",
  authMiddleware,
  authorizeRole("ADMIN"),
  ProfessionalSpecialtyController.setStatus
);

export default router;