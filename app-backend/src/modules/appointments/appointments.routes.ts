// src/modules/appointments/appointments.routes.ts
import { Router } from "express";
import { AppointmentsController } from "./appointments.controller";
import { authMiddleware,authorizeRole  } from "@/middlewares/auth.middleware";

const router = Router();

// Crear cita
// authMiddleware asegura que el usuario esté autenticado y treae su info en req.user
router.post("/create", authMiddleware, AppointmentsController.create);
router.get("/history", authMiddleware, AppointmentsController.history);
router.get("/upcoming", authMiddleware, AppointmentsController.upcoming);
router.patch("/:id/status", authMiddleware, authorizeRole("PROFESSIONAL"), AppointmentsController.updateStatus,);
router.post("/create-guest", AppointmentsController.createGuest);
router.get("/availability", AppointmentsController.availability);
export default router;
