// src/modules/users/professionalprofile/professionalprofile.routes.ts
import { Router } from "express";
import { ProfessionalProfileController } from "./professionalprofile.controller";
import { createUploader } from "@/core/storage/upload";
import { authMiddleware } from "@/middlewares/auth.middleware";

const uploadCertificates = createUploader("certificates");

const router = Router();

// Público
router.get("/Allprofiles", ProfessionalProfileController.getAllPublic);
router.get("/:id", ProfessionalProfileController.getPublic);

// --------------------
// Social Links
// --------------------

router.post("/social-links",authMiddleware, ProfessionalProfileController.createSocialLink);
router.patch("/social-links/:id",authMiddleware,ProfessionalProfileController.updateSocialLink,);
router.delete("/social-links/:id",authMiddleware,ProfessionalProfileController.deleteSocialLink,);

// --------------------
// Certificados
// --------------------

router.post("/certificates", authMiddleware, uploadCertificates.single("file"),ProfessionalProfileController.uploadCertificate,);
router.delete("/certificates/:id",authMiddleware, ProfessionalProfileController.deleteCertificate,);

export default router;
