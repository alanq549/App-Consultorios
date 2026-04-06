// src/modules/users/users.dto.ts
import { z } from "zod";

export const ChangeEmailDTO = z.object({
  email: z.string().email(),
password: z.string().min(8),
});

export const ChangePasswordDTO = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const UpdateAvatarDTO = z.object({
  avatar: z.string().url(),
});


export const UpdateProfileDTO = z.object({
  name: z.string().min(2).optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional()
});

export type UpdateProfileDTO = z.infer<typeof UpdateProfileDTO>;
export type ChangeEmailInput = z.infer<typeof ChangeEmailDTO>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordDTO>;
export type UpdateAvatarInput = z.infer<typeof UpdateAvatarDTO>;