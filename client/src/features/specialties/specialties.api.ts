// src/features/specialties/specialties.api.ts
import api from "@/services/axios";
import type { Specialty, SpecialtyInput } from "./types";

export const fetchSpecialties = async (): Promise<Specialty[]> => {
  const { data } = await api.get("/specialties");
  return data;
};

export const createSpecialty = async (input: SpecialtyInput): Promise<Specialty> => {
  const { data } = await api.post("/specialties", input);
  return data;
};

export const updateSpecialty = async (id: number, input: SpecialtyInput): Promise<Specialty> => {
  const { data } = await api.patch(`/specialties/${id}`, input);
  return data;
};

export const deleteSpecialty = async (id: number): Promise<void> => {
  await api.delete(`/specialties/${id}`);
};
