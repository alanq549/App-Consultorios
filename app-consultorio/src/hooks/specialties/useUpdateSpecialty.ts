import { useMutation, useQueryClient } from "@tanstack/react-query";
import { specialtyApi } from "@/api/specialty.api";
import type { Specialty } from "@/types/Specialty.type";

export const useUpdateSpecialty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<Specialty>;
    }) => specialtyApi.update(id, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
};