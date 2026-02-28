// src/features/professionals/professionalsHooks.ts
import { useQuery } from "@tanstack/react-query";
import { fetchProfessionalsBySpecialty, fetchProfessionalStats } from "./professional.api";

export const useProfessionalsBySpecialty = (specialtyId: number) => {
  return useQuery({
    queryKey: ["professionals", specialtyId],
    queryFn: () => fetchProfessionalsBySpecialty(specialtyId),
    enabled: !!specialtyId, // evita que corra si no hay id
  });
};


export const useProfessionalStats = () => {
  return useQuery({
    queryKey: ["professionalStats"],
    queryFn: fetchProfessionalStats,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
};