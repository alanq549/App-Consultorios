// src/modules/auth/auth.types.ts
import { Role } from "@prisma/client";
import type { Request as ExpressRequest } from "express";

export interface JwtPayload {
  userId: number;
  role: Role;
}

export interface AuthUser {
  id: number;
/*   email: string;
 */  role: Role;
/*   isVerified: boolean; */
}

export interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}