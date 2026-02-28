export interface User {
  id: number;
  name: string;
  lastName: string;
  avatar?: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface Schedule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
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
  user: User;
  specialty: {
    id: number;
    name: string;
  };
  services: Service[];
  schedules: Schedule[];
}
