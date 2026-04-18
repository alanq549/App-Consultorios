/// src/types/Specialty.type.ts
export interface Specialty {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ProfessionalSpecialty {
  professionalId: number;
  specialtyId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt: string | null;

  specialty: Specialty;
}