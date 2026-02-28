// src/api/appointments.api.ts
import api from "./axios";
import type {
  CreateAppointmentDTO,
  CreateGuestAppointmentDTO,
  AppointmentResponseDTO,
} from "@/types/appointments.types"; // definimos types para TS

export const createAppointment = async (data: CreateAppointmentDTO) => {
  const { data: res } = await api.post<AppointmentResponseDTO>("/appointments/create", data);
  return res;
};

export const createGuestAppointment = async (data: CreateGuestAppointmentDTO) => {
  const { data: res } = await api.post<AppointmentResponseDTO>("/appointments/create-guest", data);
  return res;
};

export const getAppointmentsHistory = async () => {
  const { data } = await api.get<AppointmentResponseDTO[]>("/appointments/history");
  return data;
};

export const getUpcomingAppointments = async () => {
  const { data } = await api.get<AppointmentResponseDTO[]>("/appointments/upcoming");
  return data;
};

export const getAvailability = async (
  professionalId: number,
  serviceId: number,
  date: string
) => {
  const { data } = await api.get("/appointments/availability", {
    params: {
      professionalId,
      serviceId,
      date,
    },
  });

  return data; // array de slots [{ startMin, endMin }]
};

