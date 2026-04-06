/// src/types/service.types.ts
import type { Specialty } from "@/types/Specialty.type";
export interface Service {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  isActive: boolean;

  specialty: Specialty;

  professionalProfileId: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceDTO {
  name: string;
  description: string;
  durationMin: number;
  price: number;
  specialtyId: number;
}

export interface UpdateServiceDTO {
  name?: string;
  description?: string;
  durationMin?: number;
  price?: number;
  specialtyId?: number;
  isActive?: boolean;
}
