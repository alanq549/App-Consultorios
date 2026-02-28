// src/features/services/services.api.ts
import api from "@/services/axios";
import type {
  CreateServiceDTO,
  UpdateServiceDTO,
} from "./types";

export const getMyServices = () => api.get("/services/my");

export const createService = (data: CreateServiceDTO) => api.post("/services", data);

export const updateService = (id: string, data: UpdateServiceDTO) =>
  api.put(`/services/${id}`, data);

export const deleteService = (id: string) =>
  api.delete(`/services/${id}`);

export const getServicesByProfessionalId = (id:string) =>
  api.get(`services/professional/${id}`);


