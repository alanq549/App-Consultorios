// src/features/appointments/appointments.api.ts
import api from "@/services/axios";
import type { Appointment, CreateAppointmentPayload } from "./types";

export const fetchMyAppointments = async (): Promise<Appointment[]> => {
  const { data } = await api.get("/appointments/professional/me");
  return data;
};
// Obtener todas las citas (admin)
export const fetchAllAppointments = async (): Promise<Appointment[]> => {
  return await api("/appointments");
};


export const fetchMyAppointmentsClient = async (): Promise<Appointment[]> => {
  const { data } = await api.get("/appointments/client/me"); // <-- AQUÍ EL CAMBIO
  return data;
};

export const createAppointment = async (payload: CreateAppointmentPayload): Promise<Appointment> => {
  const { data } = await api.post("/appointments", payload);
  return data;
};

export const updateAppointmentStatus = async (id: number, status: string): Promise<Appointment> => {
  const { data } = await api.patch(`/appointments/${id}`, { status });
  return data;
};