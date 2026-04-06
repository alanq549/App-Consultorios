import { useQuery } from "@tanstack/react-query";
import { scheduleApi } from "@/api/schedule.api";
import { scheduleKeys } from "@/features/schedules/keys/schedules.keys";

export function useSchedules(profileId: number) {
  return useQuery({
    queryKey: scheduleKeys.list(profileId),
    queryFn: () =>
      scheduleApi.getByProfessional(profileId).then((r) => r.data),
    enabled: !!profileId,
  });
}