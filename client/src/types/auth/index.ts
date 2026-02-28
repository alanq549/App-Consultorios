export interface SocialLinks {
    whatsApp?: string;
      instagram?: string;
      facebook?: string;
      telegram?: string;
}

export interface ProfessionalProfile {
  id: number;
  userId: number;
  specialtyId: number;
  description: string;
  certificates: string[];
  socialLinks: Record<string, string>;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  specialty: {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface BaseRegisterPayload {
  name: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  avatar: File | null;
  isProfessional: boolean;
}

export interface UserConfig {
  id: number;
  userId: number;
  language: string;
  theme: 'light' | 'dark';
  layout: 'comfortable' | 'compact' | string; // podés ajustar los posibles valores
  notificationsEnabled: boolean;
  preferences: Record<string, unknown>; // si no está definido aún
  createdAt: string;
  updatedAt: string;
}

// Payload específico para un profesional
export interface ProfessionalRegisterPayload extends BaseRegisterPayload {
  isProfessional: true;
  professionalProfile: ProfessionalProfile;
}

// Payload para un cliente (no profesional)
export interface ClientRegisterPayload extends BaseRegisterPayload {
  isProfessional: false;
  professionalProfile?: never; // no debe existir para cliente
}

// Unión para el payload de registro
export type RegisterCredentials = ProfessionalRegisterPayload | ClientRegisterPayload;

// Para login solo email y password
export interface LoginCredentials {
  email: string;
  password: string;
}

export type UserRole = 'ADMIN' | 'CLIENT' | 'PROFESSIONAL';

export interface User {
  id: number; // antes era string, pero estás recibiendo número
  name: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  role: UserRole;
  isVerified: boolean;
    config: UserConfig; // 👈 acá lo agregás

  professionalProfile?: ProfessionalProfile;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
