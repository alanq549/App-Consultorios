// src/hooks/services/useServices.ts

import { useQuery } from "@tanstack/react-query";
import { getServicesByProfessional } from "@/api/service.api";

export const useServices = (profileId: number) => {
  return useQuery({
    queryKey: ["services", profileId],
    queryFn: () => getServicesByProfessional(profileId),
    enabled: !!profileId,
  });
};