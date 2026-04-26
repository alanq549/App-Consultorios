import { z } from "zod";

export const CreateReviewDTO = z.object({
  appointmentId: z.number(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional()
});

export type CreateReviewInput = z.infer<typeof CreateReviewDTO>;