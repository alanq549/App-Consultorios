import { getAvailability } from "@/api/appointment.api";
import { useQuery } from "@tanstack/react-query";
import type { TimeSlot } from "@/types/booking.types";

export function useAvailability(
  professionalId: number,
  serviceId: number,
  date: string | null
) {
  return useQuery<TimeSlot[]>({
    queryKey: ["availability", professionalId, serviceId, date],
    queryFn: () => getAvailability(professionalId, serviceId, date!),
    enabled: !!date,
    initialData: []
  });
}