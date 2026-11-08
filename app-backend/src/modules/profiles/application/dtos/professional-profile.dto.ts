/// ARCHIVO: src/modules/profiles/application/dtos/professional-profile.dto.ts
import { ProfessionalStatus, SpecialtyStatus } from "@prisma/client";

export interface ProfessionalSpecialtySummaryDTO {
  id: number;
  name: string;
  description: string | null;
  status: SpecialtyStatus;
}

export interface ProfessionalSocialLinkDTO {
  id?: number;
  type: string;
  url: string;
}

export interface ProfessionalCertificateDTO {
  id: number;
  name: string;
  issuedBy: string;
  issuedDate: Date;
  fileUrl: string;
}

/// DTO privado para /api/users/me (conserva verificationStatus, phone, certificates, etc.)
export interface ProfessionalProfileMeDTO {
  id: number;
  name: string;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  description: string;
  ratingAvg: number;
  ratingCount: number;
  verificationStatus: ProfessionalStatus;
  specialties: ProfessionalSpecialtySummaryDTO[];
  socialLinks: ProfessionalSocialLinkDTO[];
  certificates: ProfessionalCertificateDTO[];
}

/// DTO público para /api/professionals/:id y /Allprofiles
/// ATENCIÓN: Decisión D2 intencional — NO serializa verificationStatus
export interface PublicProfessionalProfileDTO {
  id: number;
  name: string;
  lastName: string | null;
  avatar: string | null;
  description: string;
  ratingAvg: number;
  ratingCount: number;
  socialLinks: ProfessionalSocialLinkDTO[];
  certificates: unknown[];
  specialties: unknown[];
}

export interface UpdateProfessionalProfileInput {
  name?: string;
  lastName?: string;
  phone?: string;
}

