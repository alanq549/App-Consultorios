"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/service/service.routes.ts
const express_1 = require("express");
const service_controller_1 = require("./service.controller");
const auth_middleware_1 = require("@/middlewares/auth.middleware");
const role_middleware_1 = require("@/middlewares/role.middleware");
const router = (0, express_1.Router)();
// Público (cliente)
router.get("/professional/:profileId", service_controller_1.ServiceController.listByProfessional);
// Profesional
router.post("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("PROFESSIONAL"), service_controller_1.ServiceController.create);
router.put("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("PROFESSIONAL"), service_controller_1.ServiceController.update);
router.delete("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("PROFESSIONAL"), service_controller_1.ServiceController.remove);
exports.default = router;
