// src/features/schedules/schedules.api.ts
import api from "@/services/axios";
import type { CreateScheduleDTO, UpdateScheduleDTO, Schedule } from "./types";

export const getAvailableSchedules = (professionalId: number) =>
  api.get<Schedule[]>(`/schedules/available/${professionalId}`);

export const getMySchedules = () => api.get<Schedule[]>(`/schedules/my`);

export const createSchedules = (data: CreateScheduleDTO | CreateScheduleDTO[]) =>
  api.post<Schedule[]>(`/schedules`, data);

export const updateSchedule = (id: number, data: UpdateScheduleDTO) =>
  api.patch<Schedule>(`/schedules/${id}`, data);

export const deleteSchedule = (id: number) => api.delete(`/schedules/${id}`);
