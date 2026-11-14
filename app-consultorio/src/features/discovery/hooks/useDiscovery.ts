/// ARCHIVO: src/features/discovery/hooks/useDiscovery.ts
import { useQuery } from "@tanstack/react-query";
import { discoveryApi } from "../api/discovery.api";

export const usePublicSpecialties = () => {
  return useQuery({
    queryKey: ["discovery", "specialties"],
    queryFn: discoveryApi.listSpecialties,
  });
};

export const useProfessionalPublicSpecialties = (profileId: number) => {
  return useQuery({
    queryKey: ["discovery", "professional-specialties", profileId],
    queryFn: () => discoveryApi.listProfessionalSpecialties(profileId),
    enabled: !!profileId,
  });
};

export const useProfessionalPublicOffers = (profileId: number) => {
  return useQuery({
    queryKey: ["discovery", "professional-offers", profileId],
    queryFn: () => discoveryApi.listProfessionalOffers(profileId),
    enabled: !!profileId,
  });
};
