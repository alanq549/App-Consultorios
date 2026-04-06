export const scheduleKeys = {
  all: ["schedules"] as const,

  lists: () => [...scheduleKeys.all, "list"] as const,

  list: (professionalId: number) =>
    [...scheduleKeys.lists(), professionalId] as const,

  detail: (scheduleId: number) =>
    [...scheduleKeys.all, "detail", scheduleId] as const,
};