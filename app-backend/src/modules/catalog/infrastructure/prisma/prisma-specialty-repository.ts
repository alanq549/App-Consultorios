/// ARCHIVO: src/modules/catalog/infrastructure/prisma/prisma-specialty-repository.ts
/// Implementación de SpecialtyRepository desacoplada en puertos y enlazada con Prisma.

import { Specialty as PrismaSpecialty } from "@prisma/client";
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { Specialty } from "../../domain/specialty.entity";
import { extractPrismaClient } from "./prisma-transaction-context";

export class PrismaSpecialtyRepository implements SpecialtyRepository {
  private toDomain(record: PrismaSpecialty): Specialty {
    return Specialty.create({
      id: record.id,
      name: record.name,
      description: record.description,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findById(
    id: number,
    txContext?: TransactionContext,
  ): Promise<Specialty | null> {
    const db = extractPrismaClient(txContext);
    const record = await db.specialty.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByName(
    name: string,
    txContext?: TransactionContext,
  ): Promise<Specialty | null> {
    const db = extractPrismaClient(txContext);
    const record = await db.specialty.findUnique({
      where: { name },
    });
    return record ? this.toDomain(record) : null;
  }

  async listActive(txContext?: TransactionContext): Promise<Specialty[]> {
    const db = extractPrismaClient(txContext);
    const records = await db.specialty.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return records.map((record: PrismaSpecialty) => this.toDomain(record));
  }

  async listInactive(txContext?: TransactionContext): Promise<Specialty[]> {
    const db = extractPrismaClient(txContext);
    const records = await db.specialty.findMany({
      where: { isActive: false },
      orderBy: { name: "asc" },
    });
    return records.map((record: PrismaSpecialty) => this.toDomain(record));
  }

  async create(
    data: { name: string; description?: string | null; isActive?: boolean },
    txContext?: TransactionContext,
  ): Promise<Specialty> {
    const db = extractPrismaClient(txContext);
    const record = await db.specialty.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      },
    });
    return this.toDomain(record);
  }

  async update(
    id: number,
    data: { name?: string; description?: string | null; isActive?: boolean },
    txContext?: TransactionContext,
  ): Promise<Specialty> {
    const db = extractPrismaClient(txContext);
    const record = await db.specialty.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    return this.toDomain(record);
  }
}
