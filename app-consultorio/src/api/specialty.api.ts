import api from "./axios";
import type { Specialty } from "@/types/Specialty.type";

export const specialtyApi = {

  getAll: async (): Promise<Specialty[]> => {
    const { data } = await api.get("/specialties");
    return data;
  },
  getSoftDeleted:  async (): Promise<Specialty[]> => {
    const { data } = await api.get("/specialties/soft-deleted");
    return data;
  },

  create: async (payload: {name: string, description?: string}) => {
    const { data } = await api.post("/specialties", payload);
    return data;
  },

  update: async (id: number, payload: Partial<Specialty>) => {
    const { data } = await api.patch(`/specialties/${id}`, payload);
    return data;
  },
  
 restore: async (id: number): Promise<Specialty> => {
  const { data } = await api.patch(`/specialties/${id}/restore`);
  return data;
},

  remove: async (id: number) => {
    const { data } = await api.delete(`/specialties/${id}`);
    return data;
  },

  getByProfessional: async (profileId: number) => {
    const { data } = await api.get(`/specialties/professional/${profileId}`);
    return data;
  },
};