// src/types/appointments.types.ts
export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type CreateAppointmentDTO = {
  professionalProfileId: number;
  serviceId: number;
  date: string;
  startMin: number;
  notes?: string;
};

export type CreateGuestAppointmentDTO = {
  professionalProfileId: number;
  serviceId: number;
  date: string;
  startMin: number;
  notes?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
};

export type AppointmentResponseDTO = {
  id: number;
  date: string;
  startMin: number;
  endMin: number;
  notes?: string | null;
  status: AppointmentStatus;
  service: {
    id: number;
    name: string;
    description: string;
    durationMin: number;
    price: number;
  };
  professional: {
    id: number;
    name: string;
    lastName?: string | null;
    phone?: string | null;
    avatar?: string | null;
    specialty?: { id: number; name: string } | null;
    user: { id: number; email: string };
  };
  client?: {
    id: number;
    avatar?: string | null;
    name: string;
    lastName?: string | null;
    user: { id: number; email: string };
  } | null;

  guest?: {
    id: number;
    avatar?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export interface BookingSelection {
  professionalId: number
  serviceId: number
  date: string
  startMin: number
  endMin: number
}
