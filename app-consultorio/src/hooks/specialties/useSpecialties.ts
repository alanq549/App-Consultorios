import { useQuery } from "@tanstack/react-query";
import { specialtyApi } from "@/api/specialty.api";

export const useSpecialties = () => {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: specialtyApi.getAll,
  });
};

export const useSpecialtiesByProfessional = (professionalId: number) => {
  return useQuery({
    queryKey: ["specialties", "professional", professionalId],
    queryFn: () => specialtyApi.getByProfessional(professionalId),
    enabled: !!professionalId,
  });
};