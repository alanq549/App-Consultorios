// src/modules/auth/auth.tokens.ts
import jwt from "jsonwebtoken";
import { JwtPayload } from "./auth.types";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido en las variables de entorno");
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = "7d";

export function generateToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

//proximamente: refresh tokens, email verification tokens, reset password tokens, etc
