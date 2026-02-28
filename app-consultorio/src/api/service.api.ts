import api from "./axios";
import type { Service } from "@/types/service.type";

export const getServicesByProfessional = async (
  profileId: number
): Promise<Service[]> => {
  const { data } = await api.get<Service[]>(
    `/services/professional/${profileId}`
  );
  return data;
};
