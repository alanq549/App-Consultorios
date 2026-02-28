// src/features/Admin/admin.api.ts
import axios from "../../services/axios";
import type { User, AdminStats } from "./admin.types";

export const fetchUsers = async (): Promise<User[]> => {
  const res = await axios.get<User[]>("/admin/");
  return res.data;
};

// Obtener estadísticas del dashboard
export const fetchAdminStats = async (): Promise<AdminStats> => {
  const res = await axios.get<AdminStats>("/admin/stats");
  return res.data;
};