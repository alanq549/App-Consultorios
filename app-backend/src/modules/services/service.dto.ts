// src/modules/service/service.dto.ts
import { z } from "zod";

const SLOT_MINUTES = 15;

export const CreateServiceSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(5),
  durationMin: z
    .number()
    .int()
    .positive()
    .refine((v) => v % SLOT_MINUTES === 0, { message: "durationMin debe ser múltiplo de 15" }),
  price: z.number().positive(),
  specialtyId: z.number().int().positive(), // <-- agregado
});

export type CreateServiceDTO = z.infer<typeof CreateServiceSchema>;

// DTO para actualizar servicio
export const UpdateServiceSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  durationMin: z
    .number()
    .int()
    .positive()
    .refine((v) => v % SLOT_MINUTES === 0, { message: "durationMin debe ser múltiplo de 15" })
    .optional(),
  price: z.number().positive().optional(),
  specialtyId: z.number().int().positive().optional(), // opcional en update
  isActive: z.boolean().optional(),
});

export type UpdateServiceDTO = z.infer<typeof UpdateServiceSchema>;