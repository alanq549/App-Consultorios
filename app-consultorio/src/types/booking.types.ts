// src/types/booking.types.ts
export type TimeSlot = {
  startMin: number;
  endMin: number;
  dayOfWeek?: number; // opcional, si quieres usarlo
};

export type SelectedBooking = {
  professionalId: number;
  serviceId?: number;
  date?: string;
  slot?: TimeSlot;
};

