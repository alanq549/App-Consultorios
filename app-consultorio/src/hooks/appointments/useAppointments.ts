import { useQuery } from "@tanstack/react-query";
import {
  getUpcomingAppointments,
  getAppointmentsHistory,
} from "@/api/appointment.api";

export const useUpcomingAppointments = () => {
  return useQuery({
    queryKey: ["appointments", "upcoming"],
    queryFn: getUpcomingAppointments,
  });
};

export const useAppointmentsHistory = () => {
  return useQuery({
    queryKey: ["appointments", "history"],
    queryFn: getAppointmentsHistory,
  });
};