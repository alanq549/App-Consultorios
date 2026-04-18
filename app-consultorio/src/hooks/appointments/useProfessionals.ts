// src/hooks/appointments/useProfessionals.ts 
import { useQuery } from "@tanstack/react-query";
import { professionalApi } from "@/api/professional.api";

export const useProfessionals = () => {
  return useQuery({
    queryKey: ["professionals", "public"],
    queryFn: professionalApi.getProfessionalProfilesAll,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
};