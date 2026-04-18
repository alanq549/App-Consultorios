import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointmentStatus } from "@/api/appointment.api";
import toast from "react-hot-toast";

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

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });

      const message =
        variables.status === "CONFIRMED"
          ? "Cita confirmada ✔"
          : "Cita cancelada ✔";

      toast.success(message);
    },

    onError: () => {
      toast.error("No se pudo actualizar la cita");
    },
  });
};