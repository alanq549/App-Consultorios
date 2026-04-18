/// src/hooks/admin/useAdminProfiles.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminApi } from "@/api/admin.api";

export const usePendingProfiles = () => {
  return useQuery({
    queryKey: ["admin", "pendingProfiles"],
    queryFn: AdminApi.getPendingProfiles,
  });
};

export const useAdminProfiles = () => {
  return useQuery({
    queryKey: ["admin", "professionals"],
    queryFn: AdminApi.getAllProfiles,
  });
};


export const useReviewProfessionalProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      status,
    }: {
      profileId: number;
      status: "APPROVED" | "REJECTED";
    }) => AdminApi.reviewProfessionalProfile(profileId, status),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "pendingProfiles"],
      });
    },
  });
};


export const useSetProfileStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      status,
    }: {
      profileId: number;
      status: "APPROVED" | "SUSPENDED";
    }) => AdminApi.setProfileStatus(profileId, status),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "professionals"],
      });
    },
  });
};

export const useSetSpecialtyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      professionalId,
      specialtyId,
      status,
    }: {
      professionalId: number;
      specialtyId: number;
      status: "APPROVED" | "REJECTED";
    }) =>
      AdminApi.setSpecialtyStatus(professionalId, specialtyId, status),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "professionals"],
      });
    },
  });
};