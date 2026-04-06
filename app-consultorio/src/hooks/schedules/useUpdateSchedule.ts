import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleApi } from "@/api/schedule.api";
import type { UpdateScheduleDTO } from "@/types/schedules.types";
import { scheduleKeys } from "@/features/schedules/keys/schedules.keys";

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateScheduleDTO }) =>
      scheduleApi.update(id, data).then((r) => r.data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.all,
      });
    },
  });
}