/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-catalog-specialty-checker.ts
import prisma from "@/shared/database/prisma";
import { PrismaClient } from "@prisma/client";
import { CatalogSpecialtyChecker } from "../../application/ports/catalog-specialty-checker.port";

export class PrismaCatalogSpecialtyChecker implements CatalogSpecialtyChecker {
  async countApprovedSpecialties(
    professionalId: number,
    txClient?: unknown
  ): Promise<number> {
    const db = (txClient as PrismaClient) ?? prisma;
    return db.professionalSpecialty.count({
      where: {
        professionalId,
        status: "APPROVED",
      },
    });
  }
}

