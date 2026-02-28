// src/features/appointments/appointmentsHooks.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { createAppointment, fetchMyAppointments, fetchAllAppointments, fetchMyAppointmentsClient, updateAppointmentStatus} from "./appointments.api";

export const useMyAppointments = () => {
  return useQuery({
    queryKey: ["appointments", "professional"],
    queryFn: fetchMyAppointments,
  });
};


export const useMyClientAppointments = () => {
  return useQuery({
    queryKey: ["appointments", "client"],
    queryFn: fetchMyAppointmentsClient,
  });
};

export const useCreateAppointment = () => {
  return useMutation({
    mutationFn: createAppointment,
  });
};

export const useAllAppointments = () => {
  return useQuery({
    queryKey: ["appointments", "all"],
    queryFn: fetchAllAppointments,
  });
};

export const useUpdateAppointmentStatus = () => {
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateAppointmentStatus(id, status),
  });
};