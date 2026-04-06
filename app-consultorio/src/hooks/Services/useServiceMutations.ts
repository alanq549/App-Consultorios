import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createService,
  updateService,
  deleteService,
} from "@/api/service.api";

import { type UpdateServiceDTO } from "@/types/service.type";

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateServiceDTO }) =>
      updateService(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
};