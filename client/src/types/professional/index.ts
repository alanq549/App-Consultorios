export interface UpdateProfessionalProfilePayload {
  name?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;        // o mejor un File para subir imagen? 
  description?: string;
  specialtyId?: number;
  socialLinks?: Record<string, string>;
}

export interface ProfessionalProfileResponse {
  user: {
    id: number;
    name: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
  };
  professionalProfile: {
    id: number;
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
    services: unknown[];    // puedes detallar si quieres
    schedules: unknown[];
  };
}
