/// ARCHIVO: src/modules/tenancy/http/tenancy.routes.ts
/// Definición de rutas y endpoints HTTP del módulo de tenancy.
///
/// Propósito: Configurar el enrutador de Express (`Router`) para exponer las peticiones
/// asociadas al contexto del tenant, asegurando los endpoints mediante middlewares
/// de autenticación previo a la ejecución de los controladores.

import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { TenancyController } from "@/modules/tenancy/http/tenancy.controller";

const router = Router();

/// GET /current
/// Protegido por `authMiddleware` (requiere un token/sesión de usuario válida en `req.user`).
/// Retorna la información y contexto del tenant seleccionado en la cabecera 'X-Tenant-ID'.
router.get("/current", authMiddleware, TenancyController.getCurrent);

export default router;