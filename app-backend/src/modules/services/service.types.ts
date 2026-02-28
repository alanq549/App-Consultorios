// src/modules/service/service.types.ts
import { Decimal } from "@prisma/client/runtime/library";

export interface ServiceEntity {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  price: Decimal;
  isActive: boolean;
  profileId: number;
  createdAt: Date;
  updatedAt: Date;
}
