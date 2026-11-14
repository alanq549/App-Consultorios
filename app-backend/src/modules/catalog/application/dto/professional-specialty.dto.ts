/// ARCHIVO: src/modules/catalog/application/dto/professional-specialty.dto.ts
import { ProfessionalSpecialtyStatus } from "../../domain/professional-specialty.entity";

export interface RequestProfessionalSpecialtyInput {
  professionalId: number;
  specialtyId: number;
}

export interface ReviewProfessionalSpecialtyInput {
  professionalId: number;
  specialtyId: number;
  status: ProfessionalSpecialtyStatus;
}

export interface ProfessionalSpecialtyResponseDTO {
  professionalId: number;
  specialtyId: number;
  status: ProfessionalSpecialtyStatus;
  requestedAt: Date;
  reviewedAt: Date | null;
}

