import { z } from "zod";

export const CreateReviewDTO = z.object({
  appointmentId: z.number(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional()
});

/// Lote de citas del que se solicitan reseñas. Las citas en las que el usuario no participa se
/// descartan en el servicio (lectura sólo por propiedad).
export const GetReviewsByAppointmentsDTO = z.object({
  appointmentIds: z.array(z.number().int()),
});

export type CreateReviewInput = z.infer<typeof CreateReviewDTO>;