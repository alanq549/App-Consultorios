import { Router } from "express";
import { ReviewsController } from "./reviews.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";

const router = Router();

router.post("/", authMiddleware,requireRole("CLIENT"), ReviewsController.create);

// Lectura pública del listado de reseñas de un profesional: exige `X-Tenant-ID` válido y una
// afiliación ACTIVE del profesional en ese tenant (404 uniforme si no la tiene).
router.get(
  "/professional/:professionalProfileId",
  authMiddleware,
  resolvePublicTenantMiddleware(),
  ReviewsController.getProfessionalReviews,
);

// Lecturas por propiedad: se acotan al usuario autenticado y no exigen selector de tenant.
router.get("/appointment/:appointmentId", authMiddleware, ReviewsController.getByAppointment);
router.post("/batch/by-appointments", authMiddleware, ReviewsController.getByAppointments);

export default router;