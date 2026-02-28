// src/modules/users/professionalprofile/professionalprofile.types.ts

export interface PublicProfessionalProfile {
  id: number;
  name: string;
  lastName?: string | null;
  avatar?: string | null;
  description: string;
  verificationStatus: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED"; // o usar enum ProfessionalStatus
  specialties: {
    id: number;
    name: string;
    description?: string | null;
  }[];
}