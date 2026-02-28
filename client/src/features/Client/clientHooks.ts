import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClientProfile, updateClientProfile } from "./client.api";
import type { UpdateClientProfileDto } from "./types";
import { useDispatch } from "react-redux";

import { updateUserProfile } from "@/features/auth/authSlice";

export const useClientProfile = () => {
  return useQuery({
    queryKey: ["clientProfile"],
    queryFn: getClientProfile,
  });
};

export const useUpdateClientProfile = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch(); // <--- importante

  return useMutation({
    mutationFn: (data: UpdateClientProfileDto) => updateClientProfile(data),
    onSuccess: (data) => {
      // ⚡️ Actualiza el store auth con los nuevos datos
      dispatch(updateUserProfile(data));

      // 🔄 Revalida la cache de React Query
      queryClient.invalidateQueries({
        queryKey: ["clientProfile"],
      });
    },
  });
};

