import { useMutation, useQueryClient } from "@tanstack/react-query";
import { specialtyApi } from "@/api/specialty.api";

export const useCreateSpecialty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: specialtyApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
};