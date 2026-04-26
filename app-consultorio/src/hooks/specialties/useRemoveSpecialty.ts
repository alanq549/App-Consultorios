import { useMutation, useQueryClient } from "@tanstack/react-query";
import { specialtyApi } from "@/api/specialty.api";

export const useRemoveSpecialty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => specialtyApi.remove(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
      queryClient.invalidateQueries({ queryKey: ["specialties", "inactive"] });
    },
  });
};