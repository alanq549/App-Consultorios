// src/api/professional.ts
import axiosForm from "@/services/axiosForm"; 
import type { ProfessionalProfile } from "./types"; // asume que tienes tipo para profesionales
import api from "@/services/axios";

export const updateProfessionalProfileWithFiles = async (formData: FormData) => {
  const response = await axiosForm.patch("/professionals/me", formData);
  return response.data;
};

export const fetchProfessionalsBySpecialty = async (specialtyId: number): Promise<ProfessionalProfile[]> => {
  const { data } = await api.get(`/professionals/by-specialty/${specialtyId}`);
  return data;
};


export const fetchProfessionalStats = async () => {
  const { data } = await api.get("/professionals/stats"); // coincide con la ruta que pusiste
  return data;
};