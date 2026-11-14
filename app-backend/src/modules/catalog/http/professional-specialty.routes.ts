/// ARCHIVO: src/modules/catalog/http/professional-specialty.routes.ts
/// Rutas de elegibilidad ProfessionalSpecialty para Catalog.

import { Router } from "express";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";
import { ProfessionalSpecialtyController } from "./professional-specialty.controller";

export function createProfessionalSpecialtyRouter(
  controller: ProfessionalSpecialtyController
): Router {
  const router = Router();

  // Solicitud de especialidad por profesional autenticado
  router.post(
    "/specialties/:specialtyId",
    authMiddleware,
    authorizeRole("PROFESSIONAL"),
    controller.requestSpecialty
  );

  // Alias legado de solicitud
  router.post(
    "/me/specialties/:specialtyId/request",
    authMiddleware,
    authorizeRole("PROFESSIONAL"),
    controller.requestSpecialty
  );

  // Revisión de elegibilidad por admin global
  router.patch(
    "/:professionalId/specialties/:specialtyId/status",
    authMiddleware,
    authorizeRole("ADMIN"),
    controller.setStatus
  );

  return router;
}

