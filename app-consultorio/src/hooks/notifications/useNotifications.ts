// src/hooks/notifications/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/api/notification.api";
import type { Notification } from "@/types/notification.type";

export const useNotifications = () => {
  const queryClient = useQueryClient();

  // Obtener todas las notificaciones
  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery<Notification[], Error>({
    queryKey: ["notifications"],
    queryFn: notificationApi.getNotifications,
  });

  // Marcar notificación como leída (optimista)
  const markAsReadMutation = useMutation<Notification, Error, number>({
    mutationFn: notificationApi.markAsRead,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData<Notification[]>([
        "notifications",
      ]);

      // Actualización optimista
      queryClient.setQueryData<Notification[]>(
        ["notifications"],
        (old) =>
          old?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? [],
      );

      return { previousNotifications };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Marcar todas como leídas (optimista)
  const markAllAsReadMutation = useMutation<Notification[], Error, void>({
    mutationFn: notificationApi.markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData<Notification[]>([
        "notifications",
      ]);

      // Actualización optimista
      queryClient.setQueryData<Notification[]>(
        ["notifications"],
        (old) => old?.map((n) => ({ ...n, isRead: true })) ?? [],
      );

      return { previousNotifications };
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Contador de no leídas
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    isLoading,
    unreadCount,
    refetch,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
  };
};
