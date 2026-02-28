// src/types/auth.types.ts

/* ===== ROLES ===== */
export type Role = "CLIENT" | "PROFESSIONAL" | "ADMIN";

/* ===== CONFIG ===== */
export interface UserConfig {
  language: "ES" | "EN";
  theme: "LIGHT" | "DARK";
  layout: "SIDEBAR" | "TOPBAR";
  notificationsEnabled: boolean;
}

/* ===== PROFILES ===== */
interface BaseProfile {
  id: number;
  name: string;
  lastName: string;
  phone: string;
  avatar?: string;
  isVerified: boolean;
}

/* CLIENT */
export type ClientProfile = BaseProfile;

/* PROFESSIONAL */
export interface Specialty {
  id: number;
  name: string;
  description: string;
}

export interface ProfessionalProfile extends BaseProfile {
  description?: string;
  specialty: Specialty;
}

/* ADMIN */
export type AdminProfile = BaseProfile;

/* ===== REGISTER PROFILES ===== */
export interface RegisterBaseProfile {
  name: string;
  lastName: string;
  phone: string;
}

export interface RegisterProfessionalProfile extends RegisterBaseProfile {
  specialtyId: number;
  description?: string;
}

/* ===== REGISTER REQUEST ===== */
export type RegisterRequest =
  | {
      email: string;
      password: string;
      role: "CLIENT";
      profile: RegisterBaseProfile;
    }
  | {
      email: string;
      password: string;
      role: "PROFESSIONAL";
      profile: RegisterProfessionalProfile;
    };

/* ===== LOGIN ===== */
export interface LoginUser {
  id: number;
  email: string;
  role: Role;
  isVerified: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: LoginUser;
}

/* ===== ME RESPONSE ===== */
export type MeResponse =
  | {
      role: "CLIENT";
      profile: ClientProfile;
      config: UserConfig;
    }
  | {
      role: "PROFESSIONAL";
      profile: ProfessionalProfile;
      config: UserConfig;
    }
  | {
      role: "ADMIN";
      profile: AdminProfile;
      config: UserConfig;
    };

/* ===== AUTH USER (STORE) ===== */
export type AuthUser =
  | (LoginUser & {
      role: "CLIENT";
      profile: ClientProfile;
      config: UserConfig;
    })
  | (LoginUser & {
      role: "PROFESSIONAL";
      profile: ProfessionalProfile;
      config: UserConfig;
    })
  | (LoginUser & {
      role: "ADMIN";
      profile: AdminProfile;
      config: UserConfig;
    });
