/// features/specialties/specialties.hooks.ts
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { fetchSpecialties, createSpecialty, updateSpecialty, deleteSpecialty } from "./specialties.api";
import type { SpecialtyInput } from "./types";

export const useSpecialties = () => {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: fetchSpecialties,
  });
};

export const useCreateSpecialty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SpecialtyInput) => createSpecialty(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
};

export const useUpdateSpecialty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SpecialtyInput }) => updateSpecialty(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
};

export const useDeleteSpecialty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSpecialty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
};
