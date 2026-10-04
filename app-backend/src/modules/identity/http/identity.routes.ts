/// ARCHIVO: src/modules/identity/http/identity.routes.ts
/// Define las rutas HTTP asociadas al módulo de identidad y las vincula con sus controladores.

import { Router } from "express";
import { IdentityController } from "./identity.controller";

const router = Router();

// Ruta POST para el inicio de sesión de usuarios
router.post("/login", IdentityController.login);
router.get("/verify", IdentityController.verifyEmail);

export default router;