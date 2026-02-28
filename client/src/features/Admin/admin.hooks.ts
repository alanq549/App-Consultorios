// src/features/Admin/admin.hooks.ts
import { useQuery } from "@tanstack/react-query";
import { fetchAdminStats, fetchUsers } from "./admin.api";
import type { AdminStats, User } from "./admin.types";

export const useUsers = () => {
  return useQuery<User[], Error>({
    queryKey: ["adminUsers"],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // 5 minutos cache
  });
};


// Hook para estadísticas
export const useAdminStats = () => {
  return useQuery<AdminStats, Error>({
    queryKey: ["adminStats"],
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60 * 5,
  });
};