// src/modules/appointments/appointments.routes.ts
import { Router } from "express";
import { AppointmentsController } from "./appointments.controller";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";

const router = Router();

// Superficies de reserva y disponibilidad: requieren X-Tenant-ID y verifican que el profesional
// tenga afiliación ACTIVE en ese tenant. Sin header válido → 400; sin afiliación → 404 uniforme.

// Crear cita
// authMiddleware asegura que el usuario esté autenticado y trae su info en req.user
router.post(
  "/create",
  authMiddleware,
  resolvePublicTenantMiddleware(),
  AppointmentsController.create,
);
// Lecturas propias: sólo devuelven las citas del propio usuario (sin fuga cruzada entre tenants).
router.get("/history", authMiddleware, AppointmentsController.history);
router.get("/upcoming", authMiddleware, AppointmentsController.upcoming);
router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRole("PROFESSIONAL"),
  AppointmentsController.updateStatus,
);
router.post(
  "/create-guest",
  resolvePublicTenantMiddleware(),
  AppointmentsController.createGuest,
);
router.get(
  "/availability",
  resolvePublicTenantMiddleware(),
  AppointmentsController.availability,
);

export default router;
