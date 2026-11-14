/// ARCHIVO: src/modules/catalog/application/ports/professional-public-specialty-query.port.ts
/// Puerto para consultar especialidades aprobadas y activas de un profesional.

import { TransactionContext } from "@/shared/types/transaction-context";

export interface ApprovedProfessionalSpecialtyRecord {
  specialtyId: number;
  specialty: {
    id: number;
    name: string;
    description: string | null;
  };
}

export interface ProfessionalPublicSpecialtyQueryPort {
  findApprovedSpecialtiesByProfessional(
    professionalId: number,
    txContext?: TransactionContext,
  ): Promise<ApprovedProfessionalSpecialtyRecord[]>;
}
