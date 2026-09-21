"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// admin.routes.ts
const express_1 = require("express");
const admin_controller_1 = require("./admin.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const professionalSpecialty_controller_1 = require("../specialty/ProfessionalSpecialty/professionalSpecialty.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.authorizeRole)("ADMIN"));
router.patch("/profiles/:profileId/review", admin_controller_1.AdminController.reviewProfessionalProfile);
router.get("/professionals", admin_controller_1.AdminController.getAllProfiles);
router.get("/profiles/pending", admin_controller_1.AdminController.getPendingProfiles);
router.patch("/profiles/:profileId/status", admin_controller_1.AdminController.setProfileStatus);
router.patch("/:professionalId/specialties/:specialtyId/status", professionalSpecialty_controller_1.ProfessionalSpecialtyController.setStatus);
exports.default = router;
