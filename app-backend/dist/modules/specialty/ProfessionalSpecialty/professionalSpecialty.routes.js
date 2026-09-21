"use strict";
// src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const professionalSpecialty_controller_1 = require("./professionalSpecialty.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * profesional solicita especialidad
 */
router.post("/me/specialties/:specialtyId/request", auth_middleware_1.authMiddleware, (0, auth_middleware_1.authorizeRole)("PROFESSIONAL"), professionalSpecialty_controller_1.ProfessionalSpecialtyController.requestSpecialty);
/**
 * admin aprueba / rechaza
 */
router.patch("/:professionalId/specialties/:specialtyId/status", auth_middleware_1.authMiddleware, (0, auth_middleware_1.authorizeRole)("ADMIN"), professionalSpecialty_controller_1.ProfessionalSpecialtyController.setStatus);
exports.default = router;
