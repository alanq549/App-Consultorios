// admin.routes.ts
import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";
import type { ProfessionalSpecialtyController } from "@/modules/catalog";

export interface AdminRouterDeps {
  professionalSpecialtyController: ProfessionalSpecialtyController;
}

export function createAdminRouter(deps: AdminRouterDeps): Router {
  const router = Router();

  router.use(authMiddleware, authorizeRole("ADMIN"));

  router.patch("/profiles/:profileId/review", AdminController.reviewProfessionalProfile);
  router.get("/professionals", AdminController.getAllProfiles);
  router.get("/profiles/pending", AdminController.getPendingProfiles);
  router.patch("/profiles/:profileId/status", AdminController.setProfileStatus);
  router.patch(
    "/:professionalId/specialties/:specialtyId/status",
    deps.professionalSpecialtyController.setStatus
  );

  return router;
}

export default createAdminRouter;
