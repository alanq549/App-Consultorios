/// ARCHIVO: src/modules/profiles/affiliations/http/professional-affiliations.routes.ts
/// Rutas HTTP protegidas para profesionales en relación a sus afiliaciones.

import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { ProfessionalAffiliationsController } from "./professional-affiliations.controller";

const router = Router();

// Todas las rutas requieren usuario autenticado
router.use(authMiddleware);

// Solicitar afiliación a un consultorio (Apply)
router.post("/", ProfessionalAffiliationsController.requestAffiliation);

// Consultar todas mis afiliaciones (con filtro opcional ?tenantId=...)
router.get("/", ProfessionalAffiliationsController.getMyAffiliations);

// Consultar mi afiliación específica con un tenant
router.get("/:tenantId", ProfessionalAffiliationsController.getMyAffiliationByTenant);

// Proponer nueva versión de contenido público (Submit Content)
router.post("/:tenantId/revisions", ProfessionalAffiliationsController.submitContent);

// Retiro voluntario del profesional (Withdraw)
router.post("/:tenantId/withdraw", ProfessionalAffiliationsController.withdraw);

// Reabrir una postulación rechazada o retirada (Reopen)
router.post("/:tenantId/reopen", ProfessionalAffiliationsController.reopen);

export default router;
