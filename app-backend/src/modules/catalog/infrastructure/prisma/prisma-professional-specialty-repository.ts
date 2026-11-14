/// ARCHIVO: src/modules/catalog/infrastructure/prisma/prisma-professional-specialty-repository.ts
/// Implementación Prisma de ProfessionalSpecialtyRepository para Catalog.

import { ProfessionalSpecialty as PrismaProfessionalSpecialty } from "@prisma/client";
import { ProfessionalSpecialtyRepository } from "../../domain/repositories/professional-specialty.repository";
import {
  ProfessionalSpecialty,
  ProfessionalSpecialtyStatus,
} from "../../domain/professional-specialty.entity";
import { TransactionContext } from "@/shared/types/transaction-context";
import { extractPrismaClient } from "./prisma-transaction-context";

export class PrismaProfessionalSpecialtyRepository
  implements ProfessionalSpecialtyRepository
{
  private toDomain(
    record: PrismaProfessionalSpecialty
  ): ProfessionalSpecialty {
    return new ProfessionalSpecialty({
      professionalId: record.professionalId,
      specialtyId: record.specialtyId,
      status: record.status as ProfessionalSpecialtyStatus,
      requestedAt: record.requestedAt,
      reviewedAt: record.reviewedAt,
    });
  }

  async findByProfessionalAndSpecialty(
    professionalId: number,
    specialtyId: number,
    txContext?: TransactionContext
  ): Promise<ProfessionalSpecialty | null> {
    const db = extractPrismaClient(txContext);
    const record = await db.professionalSpecialty.findUnique({
      where: {
        professionalId_specialtyId: {
          professionalId,
          specialtyId,
        },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async countPendingByProfessional(
    professionalId: number,
    txContext?: TransactionContext
  ): Promise<number> {
    const db = extractPrismaClient(txContext);
    return db.professionalSpecialty.count({
      where: {
        professionalId,
        status: "PENDING",
      },
    });
  }

  async countApprovedByProfessional(
    professionalId: number,
    txContext?: TransactionContext
  ): Promise<number> {
    const db = extractPrismaClient(txContext);
    return db.professionalSpecialty.count({
      where: {
        professionalId,
        status: "APPROVED",
      },
    });
  }

  async save(
    relation: ProfessionalSpecialty,
    txContext?: TransactionContext
  ): Promise<ProfessionalSpecialty> {
    const db = extractPrismaClient(txContext);
    const created = await db.professionalSpecialty.create({
      data: {
        professionalId: relation.professionalId,
        specialtyId: relation.specialtyId,
        status: relation.status,
      },
    });

    return this.toDomain(created);
  }

  async updateStatus(
    professionalId: number,
    specialtyId: number,
    status: ProfessionalSpecialtyStatus,
    reviewedAt: Date | null,
    txContext?: TransactionContext
  ): Promise<ProfessionalSpecialty> {
    const db = extractPrismaClient(txContext);
    const updated = await db.professionalSpecialty.update({
      where: {
        professionalId_specialtyId: {
          professionalId,
          specialtyId,
        },
      },
      data: {
        status,
        reviewedAt,
      },
    });

    return this.toDomain(updated);
  }
}

