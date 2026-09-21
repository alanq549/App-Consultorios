"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// notifications.routes.ts
const express_1 = require("express");
const notifications_controller_1 = require("./notifications.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.authMiddleware, notifications_controller_1.NotificationController.getNotifications);
router.put("/:id/read", auth_middleware_1.authMiddleware, notifications_controller_1.NotificationController.markAsRead);
router.put("/read-all", auth_middleware_1.authMiddleware, notifications_controller_1.NotificationController.markAllAsRead);
exports.default = router;
