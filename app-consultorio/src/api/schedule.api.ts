/// src/api/schedule.api.ts
import api from "./axios";
import type{ CreateScheduleDTO, Schedule, UpdateScheduleDTO } from "@/types/schedules.types";

export const scheduleApi = {
  getByProfessional(profileId: number) {
    return api.get<Schedule[]>(`/schedules/professional/${profileId}`);
  },

  create(data: CreateScheduleDTO) {
    return api.post<Schedule>("schedules", data);
  },

  update(id: number, data: UpdateScheduleDTO) {
    return api.put<Schedule>(`/schedules/${id}`, data);
  },

  remove(id: number) {
    return api.delete(`/schedules/${id}`);
  },
};