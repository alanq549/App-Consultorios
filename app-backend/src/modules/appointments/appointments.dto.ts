// src/modules/appointments/appointments.dto.ts
import { z } from "zod";

const SLOT_MINUTES = 15;

export const CreateAppointmentSchema = z.object({
  professionalProfileId: z.number().int(),
  serviceId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startMin: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .refine((v) => v % SLOT_MINUTES === 0, {
      message: "startMin debe ser múltiplo de 15",
    }),
  notes: z.string().optional(),
});

export type CreateAppointmentDTO = z.infer<typeof CreateAppointmentSchema>;

// -----------------------------
// DTO de respuesta para frontend
// -----------------------------
export type AppointmentResponseDTO = {
  id: number;
  date: string; // iso string
  startMin: number;
  endMin: number;
  notes?: string | null;
  status: string;
  service: {
    id: number;
    name: string;
    description: string;
    durationMin: number;
    /// D7: precio en string decimal de exactamente dos posiciones (ej. `"250.00"`), nunca `number`.
    price: string;
  };
  professional: {
    id: number;
    name: string;
    lastName?: string | null;
    phone?: string | null;
    avatar?: string | null;
    specialty?: {
      id: number;
      name: string;
    } | null;
    user: {
      id: number;
      email: string;
    };
  };
  client?: {
    id: number;
    name: string;
    lastName?: string | null;
    avatar?: string | null;
    user: {
      id: number;
      email: string;
    };
  } | null;
};

/// clientes ocacionales (invitados) los registran los profesionales.
/// `date` usa el mismo formato calendario (`YYYY-MM-DD`) que `CreateAppointmentSchema`: el servicio
/// lo combina con `"T00:00:00Z"` para obtener el instante de la cita.
export const CreateGuestAppointmentSchema = z.object({
  professionalProfileId: z.number().int(),
  serviceId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startMin: z.number().min(0).max(1440),
  notes: z.string().optional(),
  guestName: z.string(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
});

export type CreateGuestAppointmentDTO = z.infer<
  typeof CreateGuestAppointmentSchema
>;

// DTO para actualizar el estado de una cita (confirmar o cancelar)
export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
});

export type UpdateAppointmentStatusDTO = z.infer<
  typeof UpdateAppointmentStatusSchema
>;
