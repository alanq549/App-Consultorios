// admin.routes.ts
import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";
import { ProfessionalSpecialtyController } from "../specialty/ProfessionalSpecialty/professionalSpecialty.controller";

const router = Router();

router.use(authMiddleware, authorizeRole("ADMIN"));

router.patch("/profiles/:profileId/review", AdminController.reviewProfessionalProfile);
router.get("/professionals", AdminController.getAllProfiles);
router.get("/profiles/pending", AdminController.getPendingProfiles);
router.patch("/profiles/:profileId/status", AdminController.setProfileStatus);
router.patch(
  "/:professionalId/specialties/:specialtyId/status",
  ProfessionalSpecialtyController.setStatus
);
export default router;
