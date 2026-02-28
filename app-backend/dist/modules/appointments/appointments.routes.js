"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/appointments/appointments.routes.ts
const express_1 = require("express");
const appointments_controller_1 = require("./appointments.controller");
const auth_middleware_1 = require("@/middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Crear cita
// authMiddleware asegura que el usuario esté autenticado y treae su info en req.user
router.post("/create", auth_middleware_1.authMiddleware, appointments_controller_1.AppointmentsController.create);
router.get("/history", auth_middleware_1.authMiddleware, appointments_controller_1.AppointmentsController.history);
router.get("/upcoming", auth_middleware_1.authMiddleware, appointments_controller_1.AppointmentsController.upcoming);
router.post("/create-guest", appointments_controller_1.AppointmentsController.createGuest);
router.get("/availability", appointments_controller_1.AppointmentsController.availability);
exports.default = router;
