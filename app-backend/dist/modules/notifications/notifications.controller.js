"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notifications_service_1 = require("./notifications.service");
class NotificationController {
    static async getNotifications(req, res) {
        const userId = Number(req.user.id); // asumiendo que tienes auth middleware
        const notifications = await notifications_service_1.NotificationService.getUserNotifications(userId);
        res.json(notifications);
    }
    static async markAsRead(req, res) {
        const { id } = req.params;
        const notification = await notifications_service_1.NotificationService.markAsRead(Number(id));
        res.json(notification);
    }
    static async markAllAsRead(req, res) {
        const userId = Number(req.user.id);
        const result = await notifications_service_1.NotificationService.markAllAsRead(userId);
        res.json(result);
    }
}
exports.NotificationController = NotificationController;
