import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGuestAppointment } from "@/api/appointment.api";
import type { CreateGuestAppointmentDTO } from "@/types/appointments.types";

export function useCreateGuestAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGuestAppointmentDTO) =>
      createGuestAppointment(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
    },
  });
}