// src/api/notification.api.ts
import api from "./axios";
import type { Notification } from "../types/notification.type";

export const notificationApi = {
  // Obtener todas las notificaciones del usuario
  getNotifications: async (): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>("/notifications");
    return data;
  },

  // Marcar una como leída
  markAsRead: async (id: number): Promise<Notification> => {
    const { data } = await api.put<Notification>(`/notifications/${id}/read`);
    return data;
  },

  // Marcar todas como leídas
  markAllAsRead: async (): Promise<Notification[]> => {
    const { data } = await api.put<Notification[]>("/notifications/read-all");
    return data;
  },
};