import { useMutation, useQueryClient } from "@tanstack/react-query";
import { specialtyApi } from "@/api/specialty.api";

export const useRestoreSpecialty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => specialtyApi.restore(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
      queryClient.invalidateQueries({ queryKey: ["specialties", "inactive"] });
    },
  });
};