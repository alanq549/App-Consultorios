/// ARCHIVO: src/modules/catalog/infrastructure/prisma/prisma-professional-public-specialty-query.ts
/// Implementación fuertemente tipada de la consulta pública de especialidades aprobadas.

import {
  ProfessionalPublicSpecialtyQueryPort,
  ApprovedProfessionalSpecialtyRecord,
} from "../../application/ports/professional-public-specialty-query.port";
import { TransactionContext } from "@/shared/types/transaction-context";
import { extractPrismaClient } from "./prisma-transaction-context";

export class PrismaProfessionalPublicSpecialtyQuery
  implements ProfessionalPublicSpecialtyQueryPort {
  async findApprovedSpecialtiesByProfessional(
    professionalId: number,
    txContext?: TransactionContext,
  ): Promise<ApprovedProfessionalSpecialtyRecord[]> {
    const db = extractPrismaClient(txContext);
    const records = await db.professionalSpecialty.findMany({
      where: {
        professionalId,
        status: "APPROVED", // Invariante D2: Solo especialidades globalmente APROBADAS
        specialty: {
          isActive: true, // Invariante D1/D6: Solo especialidades activas
        },
      },
      select: {
        specialtyId: true,
        specialty: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        specialty: {
          name: "asc",
        },
      },
    });

    return records;
  }
}
