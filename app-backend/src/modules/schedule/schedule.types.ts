// src/modules/schedule/schedule.types.ts
export interface ScheduleEntity {
  id: number;
  profileId: number;
  dayOfWeek: number; // 0 = Domingo, 6 = Sábado
  startMin: number;
  endMin: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
