// src/modules/users/professionalprofile/professionalprofile.types.ts
/// ATENCIÓN: Cambio intencional de privacidad Fase 4 (D2) — verificationStatus ya no se serializa en el perfil público.
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
  specialties?: {
    id: number;
    name: string;
    description?: string | null;
  }[];
}