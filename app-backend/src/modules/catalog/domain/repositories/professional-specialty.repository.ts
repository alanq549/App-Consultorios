/// ARCHIVO: src/modules/catalog/domain/repositories/professional-specialty.repository.ts
/// Puerto del repositorio para la elegibilidad ProfessionalSpecialty (Catalog).

import { TransactionContext } from "@/shared/types/transaction-context";
import {
  ProfessionalSpecialty,
  ProfessionalSpecialtyStatus,
} from "../professional-specialty.entity";

export interface ProfessionalSpecialtyRepository {
  findByProfessionalAndSpecialty(
    professionalId: number,
    specialtyId: number,
    tx?: TransactionContext
  ): Promise<ProfessionalSpecialty | null>;

  countPendingByProfessional(
    professionalId: number,
    tx?: TransactionContext
  ): Promise<number>;

  countApprovedByProfessional(
    professionalId: number,
    tx?: TransactionContext
  ): Promise<number>;

  save(
    relation: ProfessionalSpecialty,
    tx?: TransactionContext
  ): Promise<ProfessionalSpecialty>;

  updateStatus(
    professionalId: number,
    specialtyId: number,
    status: ProfessionalSpecialtyStatus,
    reviewedAt: Date | null,
    tx?: TransactionContext
  ): Promise<ProfessionalSpecialty>;
}

