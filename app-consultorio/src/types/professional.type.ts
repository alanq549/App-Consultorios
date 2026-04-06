export type SocialPlatform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "WEBSITE";

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
};


export type Professional = {
  id: number;
  name: string;
  lastName: string;
  avatar?: string;
  verificationStatus: ProfessionalStatus;
  description?: string;
    ratingAvg?: number;
  ratingCount?: number;
  specialties?: Specialty[];
  socialLinks?: socialLinks[];
  certificates?: Certificate[];
};