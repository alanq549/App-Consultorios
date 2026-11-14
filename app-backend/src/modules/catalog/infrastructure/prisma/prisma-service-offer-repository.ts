/// ARCHIVO: src/modules/catalog/infrastructure/prisma/prisma-service-offer-repository.ts
/// Implementación Prisma del repositorio de ofertas reservables (D3).

import { Prisma } from "@prisma/client";
import { TransactionContext } from "@/shared/types/transaction-context";
import {
  ServiceOfferRepository,
  CreateServiceOfferData,
  UpdateServiceOfferData,
} from "../../domain/repositories/service-offer.repository";
import { ServiceOffer } from "../../domain/offer/service-offer.entity";
import { extractPrismaClient } from "./prisma-transaction-context";
import { lockServiceRowForUpdate } from "@/shared/database/service-row-lock";

type ServiceOfferRecord = Prisma.ServiceGetPayload<{
  include: { specialty: true };
}>;

export class PrismaServiceOfferRepository implements ServiceOfferRepository {
  private toDomain(record: ServiceOfferRecord): ServiceOffer {
    return ServiceOffer.fromPersistence({
      id: record.id,
      name: record.name,
      description: record.description,
      durationMin: record.durationMin,
      price: record.price.toString(),
      isActive: record.isActive,
      profileId: record.profileId,
      affiliationId: record.affiliationId ?? null,
      specialtyId: record.specialtyId,
      specialty: record.specialty
        ? { id: record.specialty.id, name: record.specialty.name }
        : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findById(
    id: number,
    txContext?: TransactionContext,
  ): Promise<ServiceOffer | null> {
    const db = extractPrismaClient(txContext);
    const record = await db.service.findUnique({
      where: { id },
      include: { specialty: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByNameInAffiliation(
    affiliationId: number,
    name: string,
    excludeId?: number,
    txContext?: TransactionContext,
  ): Promise<ServiceOffer | null> {
    const db = extractPrismaClient(txContext);
    const record = await db.service.findFirst({
      where: {
        affiliationId,
        name,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
      include: { specialty: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async listActiveByAffiliation(
    affiliationId: number,
    txContext?: TransactionContext,
  ): Promise<ServiceOffer[]> {
    const db = extractPrismaClient(txContext);
    const records = await db.service.findMany({
      where: { affiliationId, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { specialty: true },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(
    data: CreateServiceOfferData,
    txContext?: TransactionContext,
  ): Promise<ServiceOffer> {
    const db = extractPrismaClient(txContext);
    const record = await db.service.create({
      data: {
        name: data.name,
        description: data.description,
        durationMin: data.durationMin,
        price: data.price,
        profileId: data.profileId,
        affiliationId: data.affiliationId,
        specialtyId: data.specialtyId,
      },
      include: { specialty: true },
    });
    return this.toDomain(record);
  }

  async update(
    id: number,
    data: UpdateServiceOfferData,
    txContext?: TransactionContext,
  ): Promise<ServiceOffer> {
    const db = extractPrismaClient(txContext);
    const record = await db.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.durationMin !== undefined
          ? { durationMin: data.durationMin }
          : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.specialtyId !== undefined
          ? { specialtyId: data.specialtyId }
          : {}),
      },
      include: { specialty: true },
    });
    return this.toDomain(record);
  }

  async deactivate(
    id: number,
    txContext?: TransactionContext,
  ): Promise<ServiceOffer> {
    const db = extractPrismaClient(txContext);
    const record = await db.service.update({
      where: { id },
      data: { isActive: false },
      include: { specialty: true },
    });
    return this.toDomain(record);
  }

  async lockForUpdate(
    id: number,
    txContext?: TransactionContext,
  ): Promise<void> {
    await lockServiceRowForUpdate(id, txContext);
  }
}
