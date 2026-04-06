import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleApi } from "@/api/schedule.api";
import type { CreateScheduleDTO } from "@/types/schedules.types";
import { scheduleKeys } from "@/features/schedules/keys/schedules.keys";

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleDTO) =>
      scheduleApi.create(data).then((r) => r.data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.all,
      });
    },
  });
}