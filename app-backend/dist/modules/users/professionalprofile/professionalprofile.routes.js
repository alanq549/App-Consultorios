"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/users/professionalprofile/professionalprofile.routes.ts
const express_1 = require("express");
const professionalprofile_controller_1 = require("./professionalprofile.controller");
const router = (0, express_1.Router)();
// Público
router.get("/Allprofiles", professionalprofile_controller_1.ProfessionalProfileController.getAllPublic);
router.get("/:id", professionalprofile_controller_1.ProfessionalProfileController.getPublic);
exports.default = router;
