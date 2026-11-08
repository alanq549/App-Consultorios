export type SocialPlatform = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "WEBSITE";

export type ProfessionalStatus =
  | "PENDING"
  | "APPROVED"
  | "SUSPENDED"
  | "REJECTED";

export type socialLinks = {
  id: number;
  type: SocialPlatform;
  url: string;
};

export type Certificate = {
  id: number;
  title: string;
  issuedBy: string;
  issuedDate: string;
  fileUrl?: string;
};

export type Specialty = {
  id: number;
  name: string;
  description?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
};

/// Perfil público consumido en el directorio público y booking (/api/professionals/:id y /Allprofiles)
/// ATENCIÓN (Fase 4 D2): El backend NUNCA serializa verificationStatus ni teléfono en la respuesta pública.
export type PublicProfessional = {
  id: number;
  name: string;
  lastName: string | null;
  avatar?: string;
  description?: string;
  ratingAvg?: number;
  ratingCount?: number;
  specialties?: Specialty[];
  socialLinks?: socialLinks[];
  certificates?: Certificate[];
};

/// Alias de perfil para consumidores públicos del directorio
export type Professional = PublicProfessional;

/// Relación de especialidad devuelta por los endpoints administrativos de Prisma (include: { specialty: true })
export type AdminProfessionalSpecialty = {
  id?: number;
  professionalId?: number;
  specialtyId?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt?: string;
  reviewedAt?: string | null;
  specialty: {
    id: number;
    name: string;
    description?: string | null;
  };
};

/// Perfil administrativo consumido exclusivamente en el panel de administración (/api/admin/...)
export type AdminProfessional = Omit<PublicProfessional, "specialties"> & {
  phone?: string | null;
  verificationStatus: ProfessionalStatus;
  specialties?: AdminProfessionalSpecialty[];
};

/// type para mostrar en el booking, con menos info que el professional completo
export type BookingProfessional = Pick<
  PublicProfessional,
  "id" | "name" | "lastName" | "avatar" | "ratingAvg" | "ratingCount"
> & {
  specialty?: {
    id: number;
    name: string;
  } | null;
};
