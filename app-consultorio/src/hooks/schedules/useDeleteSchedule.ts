import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleApi } from "@/api/schedule.api";
import { scheduleKeys } from "@/features/schedules/keys/schedules.keys";

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      scheduleApi.remove(id).then((r) => r.data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.all,
      });
    },
  });
}