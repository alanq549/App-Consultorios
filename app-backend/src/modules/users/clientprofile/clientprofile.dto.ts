import z from "zod"

/// dto para "me"
export interface ClientProfileResponseDTO {
  id: number
  name: string
  lastName?: string | null
  phone?: string | null
  avatar?: string | null
  appointmentsCount: number
}

export const UpdateClientProfileSchema = z.object({
  name: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export type UpdateClientProfileDTO =
  z.infer<typeof UpdateClientProfileSchema>;

