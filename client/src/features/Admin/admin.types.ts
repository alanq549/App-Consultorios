// src/features/Admin/admin.types.ts
// Define or import Review interface
export interface Review  {
  id: number;
  rating: number;
  comment?: string;       // en backend es opcional (puede ser null)
  createdAt: string;
  client: {               // no userId, sino client (según el select que hiciste)
    id: number;
    name: string;
    lastName: string;
    avatar?: string;
  };
}


export interface User {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: "PROFESSIONAL" | "CLIENT" | "ADMIN"; // o string si hay más roles
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  professionalProfile: ProfessionalProfile | null;
}

export interface ProfessionalProfile {
  id: number;
  specialtyId: number;
  description: string;
  certificates: string[]; // Array de URLs
  socialLinks: Record<string, string>; // puede ser un objeto con keys como instagram, whatsApp...
  isVerified: boolean;
  specialty: {
    id: number;
    name: string;
  };
  reviews?: Review[];
}

export interface AdminStats {
  totalUsers: number;
  totalProfessionals: number;
  totalClients: number;
  totalSpecialties: number;
  totalAppointments: number;
}