// src/modules/config/config.dto.ts
import { z } from "zod";
import { LayoutType, Language, Theme } from "@prisma/client";

/**
 * Configuración editable del usuario
 * PUT /config/me
 */
export const UpdateConfigDTO = z.object({
  language: z.nativeEnum(Language).optional(),
  theme: z.nativeEnum(Theme).optional(),
  layout: z.nativeEnum(LayoutType).optional(),

  notificationsEnabled: z.boolean().optional(),

  // libre para el futuro (ej: tamaños, colores, accesibilidad)
  preferences: z.record(z.string(), z.any()).optional(),
});

export const ConfigResponseDTO = z.object({
  id: z.number(),
  userId: z.number(),

  language: z.nativeEnum(Language),
  theme: z.nativeEnum(Theme),
  layout: z.nativeEnum(LayoutType),
  notificationsEnabled: z.boolean(),

  preferences: z.any().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ConfigResponse = z.infer<typeof ConfigResponseDTO>;

export type UpdateConfigInput = z.infer<typeof UpdateConfigDTO>;
