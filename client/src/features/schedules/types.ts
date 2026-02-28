export interface Schedule {
  id: number;
  professionalId: number;
  dayOfWeek: number; // 0 - domingo ... 6 - sábado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isAvailable: boolean;
}

export interface CreateScheduleDTO {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

export interface UpdateScheduleDTO {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}
