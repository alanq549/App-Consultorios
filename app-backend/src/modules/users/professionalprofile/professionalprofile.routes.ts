// src/modules/users/professionalprofile/professionalprofile.routes.ts
import { Router } from "express";
import { ProfessionalProfileController } from "./professionalprofile.controller";
import { createUploader } from "@/core/storage/upload";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";
import { ProfessionalSpecialtyController } from "@/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller";
import { requireRole } from "@/middlewares/role.middleware";

const uploadCertificates = createUploader("certificates");

const router = Router();

// Público
router.get("/Allprofiles", ProfessionalProfileController.getAllPublic);
router.get("/:id", ProfessionalProfileController.getPublic);

// --------------------
// Social Links
// --------------------

router.post(
  "/social-links",
  authMiddleware,
  ProfessionalProfileController.createSocialLink,
);
router.patch(
  "/social-links/:id",
  authMiddleware,
  ProfessionalProfileController.updateSocialLink,
);
router.delete(
  "/social-links/:id",
  authMiddleware,
  ProfessionalProfileController.deleteSocialLink,
);

// --------------------
// Certificados
// --------------------

router.post(
  "/certificates",
  authMiddleware,
  uploadCertificates.single("file"),
  ProfessionalProfileController.uploadCertificate,
);
router.delete(
  "/certificates/:id",
  authMiddleware,
  ProfessionalProfileController.deleteCertificate,
);

/// speciality

router.patch(
  "/:professionalId/specialties/:specialtyId/status",
  authMiddleware,
  requireRole("ADMIN"),
  ProfessionalSpecialtyController.setStatus,
);
router.post(
  "/specialties/:specialtyId",
  authMiddleware,
  authorizeRole("PROFESSIONAL"),
  ProfessionalSpecialtyController.requestSpecialty
);

export default router;
