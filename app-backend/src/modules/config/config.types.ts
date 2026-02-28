// src/modules/config/config.types.ts
import { LayoutType, Language, Theme } from "@prisma/client";

/**
 * Configuración completa del usuario
 * (lo que vive en DB)
 */
export interface UserConfig {
  id: number;
  userId: number;

  language: Language;
  theme: Theme;
  layout: LayoutType;

  notificationsEnabled: boolean;
  preferences?: Record<string, any> | null;

  createdAt: Date;
  updatedAt: Date;
}
