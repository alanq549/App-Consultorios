import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointmentStatus } from "@/api/appointment.api";

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      status,
    }: {
      appointmentId: number;
      status: "CONFIRMED" | "CANCELLED";
    }) => updateAppointmentStatus(appointmentId, status),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
    },
  });
};