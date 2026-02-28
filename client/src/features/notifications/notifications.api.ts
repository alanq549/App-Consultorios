import api from "@/services/axios";
import type { Notification } from "./notifucations.types";

export const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await api.get("/notifications");
  return response.data;  // Extraemos solo los datos que esperamos
};

export const markNotificationAsRead = (id: number) =>
  api.patch(`/notifications/${id}/read`);
