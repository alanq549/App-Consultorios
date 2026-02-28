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

export const LoginDTO = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const VerifyCodeDTO = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const ForgotPasswordDTO = z.object({
  email: z.string().email(),
});

export const ResetPasswordDTO = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});
