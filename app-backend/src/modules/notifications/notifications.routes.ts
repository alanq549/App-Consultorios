// notifications.routes.ts
import { Router } from "express";
import { NotificationController } from "./notifications.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, NotificationController.getNotifications);
router.put("/:id/read", authMiddleware, NotificationController.markAsRead);
router.put("/read/all", authMiddleware, NotificationController.markAllAsRead);

export default router;