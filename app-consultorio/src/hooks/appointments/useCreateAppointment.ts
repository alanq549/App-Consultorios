import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAppointment } from "@/api/appointment.api";
import type { CreateAppointmentDTO } from "@/types/appointments.types";

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentDTO) =>
      createAppointment(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
    },
  });
}