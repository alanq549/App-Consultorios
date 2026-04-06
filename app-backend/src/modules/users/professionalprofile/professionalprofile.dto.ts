// src/modules/users/professionalprofile/professionalprofile.dto.ts
import { z } from "zod";

export const GetProfessionalProfileParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID inválido"),
});

const SocialTypeEnum = z.enum([
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "WEBSITE"
]);

export const SocialLinkSchema = z.object({
  type: SocialTypeEnum,
  url: z.string().url("URL inválida")
});

export const UpdateProfessionalProfileSchema = z.object({
  name: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateProfessionalProfileDTO = z.infer<typeof UpdateProfessionalProfileSchema>;

// DTO para las redes sociales
export const CreateSocialLinkSchema = z.object({
  type: SocialTypeEnum,
  url: z.string().url("URL inválida"),
});

export type CreateSocialLinkDTO = z.infer<typeof CreateSocialLinkSchema>;

export const UpdateSocialLinkSchema = z.object({
  url: z.string().url("URL inválida"),
});

export type UpdateSocialLinkDTO = z.infer<typeof UpdateSocialLinkSchema>;

export const SocialLinkParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID inválido"),
});

/// dto para crear un certificado
export const CreateCertificateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  issuedBy: z.string().min(1, "La institución emisora es obligatoria"),
  issuedDate: z
    .coerce
    .date()
    .refine((date) => !isNaN(date.getTime()), {
      message: "Fecha inválida"
    })
});

export type CreateCertificateDTO = z.infer<typeof CreateCertificateSchema>;


