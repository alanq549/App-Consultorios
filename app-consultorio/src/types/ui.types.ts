import type { Role } from "./auth.types";

// src/types/ui.types.ts
export interface BaseUserProfileUI {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: Role;
}

export interface ProfessionalUserProfileUI extends BaseUserProfileUI {
  role: "PROFESSIONAL";
  specialtyName: string;
  description?: string;
}

export type UserProfileUI =
  | BaseUserProfileUI
  | ProfessionalUserProfileUI;
