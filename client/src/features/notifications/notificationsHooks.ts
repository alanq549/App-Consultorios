// src/features/notifications/notificationsHooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, markNotificationAsRead } from "./notifications.api";
import type { Notification } from "./notifucations.types"

export const useNotifications = () => {
  const queryClient = useQueryClient();

const notificationsQuery = useQuery<Notification[]>({
  queryKey: ["notifications"],
  queryFn: fetchNotifications,
  refetchInterval: 30000,
});

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["notifications"]
    }),
  });

  const markAsRead = (id: number) => markReadMutation.mutate(id);

return {
  notifications: notificationsQuery.data || [],
  isLoading: notificationsQuery.isLoading,
  markAsRead,
};
};
