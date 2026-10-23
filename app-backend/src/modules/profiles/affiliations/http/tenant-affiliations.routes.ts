/// ARCHIVO: src/modules/profiles/affiliations/http/tenant-affiliations.routes.ts
/// Rutas HTTP para la gestión de afiliaciones por parte del OWNER de un consultorio.

import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { TenantAffiliationsController } from "./tenant-affiliations.controller";

const router = Router();

// Todas las rutas de administración de afiliaciones del tenant requieren autenticación
router.use(authMiddleware);

// Listar afiliaciones del consultorio
router.get("/", TenantAffiliationsController.list);

// Consultar detalle completo de una afiliación
router.get("/:affiliationId", TenantAffiliationsController.getById);

// Evaluar (aprobar/rechazar) una revisión de contenido
router.post(
  "/:affiliationId/revisions/:revisionId/review",
  TenantAffiliationsController.reviewRevision,
);

// Suspender una afiliación activa
router.post("/:affiliationId/suspend", TenantAffiliationsController.suspend);

// Reactivar una afiliación suspendida
router.post("/:affiliationId/reactivate", TenantAffiliationsController.reactivate);

// Retiro administrativo de una afiliación
router.post("/:affiliationId/withdraw", TenantAffiliationsController.withdraw);

export default router;
