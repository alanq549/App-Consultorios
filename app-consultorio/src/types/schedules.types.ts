// src/types/schedules.types.ts
export interface Schedule {
  id: number;
  profileId: number;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  isActive: boolean;
}

export interface CreateScheduleDTO {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
}

export interface UpdateScheduleDTO {
  startMin?: number;
  endMin?: number;
}