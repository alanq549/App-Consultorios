/// ARCHIVO: src/modules/specialty/ProfessionalSpecialty/ProfessionalSpecialty.Service.ts
/// Facade de compatibilidad temporal hacia Catalog (Misión 2 - Fase 5).
/// Delega la lógica de negocio a los casos de uso correspondientes de Catalog.

import { catalogContainer } from "@/app.wiring";
import { SpecialtyStatus } from "@prisma/client";

export class ProfessionalSpecialtyService {
  static async requestSpecialty(
    professionalId: number,
    specialtyId: number
  ) {
    return catalogContainer.useCases.requestProfessionalSpecialtyUseCase.execute({
      professionalId,
      specialtyId,
    });
  }

  static async setSpecialtyStatus(
    professionalId: number,
    specialtyId: number,
    newStatus: SpecialtyStatus
  ) {
    return catalogContainer.useCases.reviewProfessionalSpecialtyUseCase.execute({
      professionalId,
      specialtyId,
      status: newStatus as any,
    });
  }
}
