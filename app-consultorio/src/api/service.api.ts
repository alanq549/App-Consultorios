// src/api/service.api.ts
import api from "./axios";
import type {
  Service,
  CreateServiceDTO,
  UpdateServiceDTO
} from "@/types/service.type";

export const getServicesByProfessional = async (
  profileId: number
): Promise<Service[]> => {
  const { data } = await api.get<Service[]>(
    `/services/professional/${profileId}`
  );

  return data.map((s) => ({
    ...s,
    price: Number(s.price),
    durationMin: Number(s.durationMin),
  }));
};

export const createService = async (
  payload: CreateServiceDTO
): Promise<Service> => {
  const { data } = await api.post<Service>("/services", payload);
  return data;
};

export const updateService = async (
  id: number,
  payload: UpdateServiceDTO
): Promise<Service> => {
  const { data } = await api.patch<Service>(`/services/${id}`, payload);
  return data;
};

export const deleteService = async (id: number): Promise<void> => {
  await api.delete(`/services/${id}`);
};