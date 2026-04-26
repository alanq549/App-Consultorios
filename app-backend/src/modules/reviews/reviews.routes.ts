import { Router } from "express";
import { ReviewsController } from "./reviews.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";

const router = Router();

router.post("/", authMiddleware,requireRole("CLIENT"), ReviewsController.create);

router.get("/professional/:professionalProfileId", authMiddleware, ReviewsController.getProfessionalReviews);

router.get("/appointment/:appointmentId", authMiddleware, ReviewsController.getByAppointment);
router.post("/batch/by-appointments", authMiddleware, ReviewsController.getByAppointments);

export default router;