// src/features/specialties/types.ts
export interface Specialty {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface SpecialtyInput {
  name: string;
  description?: string;
}