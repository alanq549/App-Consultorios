// src/modules/users/professionalprofile/professionalprofile.routes.ts
import { Router } from "express";
import { ProfessionalProfileController } from "./professionalprofile.controller";

const router = Router();

// Público
router.get("/Allprofiles", ProfessionalProfileController.getAllPublic);
router.get("/:id", ProfessionalProfileController.getPublic);


export default router;
