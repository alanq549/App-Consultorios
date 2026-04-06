// hooks/Services/useServices.ts

import { useQuery } from "@tanstack/react-query";
import { getServicesByProfessional } from "@/api/service.api";
import type { Service } from "@/types/service.type";

export const useServices = (professionalId: number) => {
  return useQuery<Service[], Error>({
    queryKey: ["services", professionalId],
    queryFn: () => getServicesByProfessional(professionalId),
    enabled: !!professionalId,
  });
};