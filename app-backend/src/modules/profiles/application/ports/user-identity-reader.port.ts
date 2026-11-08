/// ARCHIVO: src/modules/profiles/application/ports/user-identity-reader.port.ts
import { Role } from "@prisma/client";

export interface UserIdentitySummary {
  id: number;
  email: string;
  isVerified: boolean;
  role: Role;
}

export interface UserIdentityReader {
  findById(userId: number): Promise<UserIdentitySummary | null>;
}

