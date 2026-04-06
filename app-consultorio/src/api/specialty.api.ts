import api from "./axios";
import type { Specialty } from "@/types/Specialty.type";

export const specialtyApi = {

  // todas las especialidades del sistema
  getAll: async (): Promise<Specialty[]> => {
    const { data } = await api.get("/specialties");
    return data;
  },

  // especialidades del profesional
  getByProfessional: async (profileId: number): Promise<Specialty[]> => {
    const { data } = await api.get(`/specialties/professional/${profileId}`);
    return data;
  },

};