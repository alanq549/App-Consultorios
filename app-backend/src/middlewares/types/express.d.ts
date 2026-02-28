// src/types/express.d.ts
import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: number;
      role: Role;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
