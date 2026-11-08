/// ARCHIVO: src/modules/profiles/application/dtos/get-current-user.dto.ts
import { Role } from "@prisma/client";

export interface GetCurrentUserResponseDTO<TProfile = unknown, TConfig = unknown> {
  role: Role;
  email: string;
  isVerified: boolean;
  profile: TProfile;
  config: TConfig;
}

