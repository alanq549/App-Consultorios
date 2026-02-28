"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/schedule/schedule.routes.ts
const express_1 = require("express");
const schedule_controller_1 = require("./schedule.controller");
const auth_middleware_1 = require("@/middlewares/auth.middleware");
const role_middleware_1 = require("@/middlewares/role.middleware");
const router = (0, express_1.Router)();
// Público (cliente)
router.get("/professional/:profileId", schedule_controller_1.ScheduleController.listByProfessional);
// Profesional
router.post("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("PROFESSIONAL"), schedule_controller_1.ScheduleController.create);
router.put("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("PROFESSIONAL"), schedule_controller_1.ScheduleController.update);
router.delete("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("PROFESSIONAL"), schedule_controller_1.ScheduleController.remove);
exports.default = router;
