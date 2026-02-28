export interface Appointment {
  id: number;
  dateTimeLocal: string;
  status: string;
  paymentStatus: string;
  notes?: string;
  service: {
    id: number;
    name: string;
    durationMinutes: number;
    price: number;
  };
  client?: {
    id: number;
    avatar:string,
    name: string;
    lastName?: string;
  };
    professional: {
    id: number;
    avatar?: string;
    name: string;
    lastName: string;
  };
}



export type CreateAppointmentPayload = {
  serviceId: number;
  professionalId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  notes?: string;
};