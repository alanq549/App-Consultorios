// src/modules/users/users.types.ts
import { Role, Language, Theme, LayoutType } from "@prisma/client";
import { UpdateClientProfileDTO } from "./clientprofile/clientprofile.dto";
import { UpdateProfessionalProfileDTO } from "./professionalprofile/professionalprofile.dto";
/* import { UpdateAdminProfileDTO } from "./adminprofile/adminprofile.dto"; */

export interface AuthUser {
  id: number;
  role: Role;
}

export interface ConfigResponse {
  language: Language;
  theme: Theme;
  layout: LayoutType;
  notificationsEnabled: boolean;
}

export interface MeResponse<TProfile = unknown> {
  role: Role;
  email: string;
  isVerified: boolean;
  profile: TProfile;
  config: ConfigResponse;
}



export type UpdateProfileInput =
  | UpdateClientProfileDTO
  | UpdateProfessionalProfileDTO
  /* | UpdateAdminProfileDTO; */