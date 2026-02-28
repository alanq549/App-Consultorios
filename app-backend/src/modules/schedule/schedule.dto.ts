// src/modules/schedule/schedule.dto.ts
import { z } from "zod";

const SLOT_MINUTES = 15;

export const CreateScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0),
    endMin: z.number().int().min(0),
  })
  .refine(
    (data) => data.startMin % SLOT_MINUTES === 0,
    { message: "startMin debe ser múltiplo de 15" }
  )
  .refine(
    (data) => data.endMin % SLOT_MINUTES === 0,
    { message: "endMin debe ser múltiplo de 15" }
  )
  .refine(
    (data) => data.endMin > data.startMin,
    { message: "endMin debe ser mayor que startMin" }
  );

export type CreateScheduleDTO = z.infer<typeof CreateScheduleSchema>;

export const UpdateScheduleSchema = z.object({
  startMin: z.number().int().optional(),
  endMin: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateScheduleDTO = z.infer<typeof UpdateScheduleSchema>;
