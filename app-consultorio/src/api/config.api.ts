import api from "@/api/axios";
import type { CustomConfig } from "@/types/config.types";

export const getMyConfig = async (): Promise<CustomConfig> => {
  const { data } = await api.get("/config/me");
  return data;
};

export const updateMyConfig = async (
  payload: Partial<CustomConfig>
): Promise<CustomConfig> => {
  const { data } = await api.put("/config/me", payload);
  return data;
};
