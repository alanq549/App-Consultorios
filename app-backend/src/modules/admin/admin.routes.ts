// admin.routes.ts
import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";
import { ProfessionalSpecialtyController } from "../specialty/ProfessionalSpecialty/professionalSpecialty.controller";

const router = Router();

router.patch("/profiles/:profileId/review",  authMiddleware, AdminController.reviewProfessionalProfile);
router.get("/professionals", AdminController.getAllProfiles);
router.get("/profiles/pending",  authMiddleware, AdminController.getPendingProfiles);
router.patch("/profiles/:profileId/status",  authMiddleware, AdminController.setProfileStatus);
router.patch(
  "/:professionalId/specialties/:specialtyId/status",
  authMiddleware,
  authorizeRole("ADMIN"),
  ProfessionalSpecialtyController.setStatus
);
export default router;