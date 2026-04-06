// src/modules/users/professionalprofile/professionalprofile.types.ts
import {ProfessionalStatus } from "@prisma/client";
export interface PublicProfessionalProfile {
  id: number;
  name: string;
  lastName?: string | null;
  avatar?: string | null;
  description: string;
  ratingAvg?: number;
  ratingCount?: number;
  certificates?: {
    title: string;
    issuedBy?: string | null;
    fileUrl: string;
  }[];
  socialLinks?: {
    type: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "WEBSITE";
    url: string;
  }[];
  verificationStatus: ProfessionalStatus; // o usar enum ProfessionalStatus
  specialties: {
    id: number;
    name: string;
    description?: string | null;
  }[];


}