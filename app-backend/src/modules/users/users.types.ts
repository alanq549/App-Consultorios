import { Role } from "@prisma/client";

export interface AuthUser {
  id: number;
  role: Role;
}

export interface MeResponse {
  role: Role;
  profile: any;
  config: any;
}
