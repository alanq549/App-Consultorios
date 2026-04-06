///src/modules/specialty/specialty.dto.ts
import { z } from "zod";

export const CreateSpecialtySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

export type CreateSpecialtyDTO = z.infer<typeof CreateSpecialtySchema>;

export const UpdateSpecialtySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSpecialtyDTO = z.infer<typeof UpdateSpecialtySchema>;

