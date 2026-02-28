// notifications.controller.ts
import { Request, Response } from "express";
import { NotificationService } from "./notifications.service";

export class NotificationController {
  static async getNotifications(req: Request, res: Response) {
    const userId = Number(req.user!.id); // asumiendo que tienes auth middleware
    const notifications = await NotificationService.getUserNotifications(userId);
    res.json(notifications);
  }

  static async markAsRead(req: Request, res: Response) {
    const { id } = req.params;
    const notification = await NotificationService.markAsRead(Number(id));
    res.json(notification);
  }

  static async markAllAsRead(req: Request, res: Response) {
const userId = Number(req.user!.id);
    const result = await NotificationService.markAllAsRead(userId);
    res.json(result);
  }
}