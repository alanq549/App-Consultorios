// src/modules/auth/auth.dto.ts
import { z } from "zod";

export const RegisterDTO = z.discriminatedUnion("role", [
  // estos dos roles son los únicos permitidos para el registro público, por lo tanto admin ya no necesita validación extra
  // CLIENT
  z.object({
    role: z.literal("CLIENT"),
    email: z.string().email(),
    password: z.string().min(8),
    profile: z.object({
      name: z.string(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
    }),
  }),

  // PROFESSIONAL
  z.object({
    role: z.literal("PROFESSIONAL"),
    email: z.string().email(),
    password: z.string().min(8),
    profile: z.object({
      name: z.string(),         
      lastName: z.string().optional(), 
      phone: z.string().optional(),    
      specialtyId: z.number(),
      description: z.string().optional(),
    }),
  }),
]);


export const RegisterResponseDTO = z.object({
  id: z.number(),
  email: z.string().email(),
  role: z.enum(["ADMIN", "PROFESSIONAL", "CLIENT"]),
  isVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseDTO>;