"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/users/professionalprofile/professionalprofile.routes.ts
const express_1 = require("express");
const professionalprofile_controller_1 = require("./professionalprofile.controller");
const upload_1 = require("../../../core/storage/upload");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const professionalSpecialty_controller_1 = require("../../../modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const uploadCertificates = (0, upload_1.createUploader)("certificates");
const router = (0, express_1.Router)();
// Público
router.get("/Allprofiles", professionalprofile_controller_1.ProfessionalProfileController.getAllPublic);
router.get("/:id", professionalprofile_controller_1.ProfessionalProfileController.getPublic);
// --------------------
// Social Links
// --------------------
router.post("/social-links", auth_middleware_1.authMiddleware, professionalprofile_controller_1.ProfessionalProfileController.createSocialLink);
router.patch("/social-links/:id", auth_middleware_1.authMiddleware, professionalprofile_controller_1.ProfessionalProfileController.updateSocialLink);
router.delete("/social-links/:id", auth_middleware_1.authMiddleware, professionalprofile_controller_1.ProfessionalProfileController.deleteSocialLink);
// --------------------
// Certificados
// --------------------
router.post("/certificates", auth_middleware_1.authMiddleware, uploadCertificates.single("file"), professionalprofile_controller_1.ProfessionalProfileController.uploadCertificate);
router.delete("/certificates/:id", auth_middleware_1.authMiddleware, professionalprofile_controller_1.ProfessionalProfileController.deleteCertificate);
/// speciality
router.patch("/:professionalId/specialties/:specialtyId/status", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("ADMIN"), professionalSpecialty_controller_1.ProfessionalSpecialtyController.setStatus);
router.post("/specialties/:specialtyId", auth_middleware_1.authMiddleware, (0, auth_middleware_1.authorizeRole)("PROFESSIONAL"), professionalSpecialty_controller_1.ProfessionalSpecialtyController.requestSpecialty);
exports.default = router;
