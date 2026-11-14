/// ARCHIVO: src/modules/catalog/application/use-cases/request-professional-specialty.use-case.ts
/// Caso de uso: el profesional solicita una especialidad para su perfil (Catalog).

import { TransactionRunner } from "@/shared/types/transaction-context";
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { ProfessionalSpecialtyRepository } from "../../domain/repositories/professional-specialty.repository";
import { ProfessionalProfilePort } from "../ports/professional-profile-lookup.port";
import { CatalogNotificationPort } from "../ports/catalog-notification.port";
import {
  SpecialtyInactiveError,
  ProfessionalSpecialtyAlreadyExistsError,
  MaxPendingSpecialtiesExceededError,
} from "../../domain/catalog-errors";
import {
  ProfessionalSpecialty,
} from "../../domain/professional-specialty.entity";
import {
  RequestProfessionalSpecialtyInput,
  ProfessionalSpecialtyResponseDTO,
} from "../dto/professional-specialty.dto";

export class RequestProfessionalSpecialtyUseCase {
  constructor(
    private readonly specialtyRepo: SpecialtyRepository,
    private readonly professionalSpecialtyRepo: ProfessionalSpecialtyRepository,
    private readonly professionalProfilePort: ProfessionalProfilePort,
    private readonly notificationPort: CatalogNotificationPort,
    private readonly transactionRunner: TransactionRunner
  ) {}

  async execute(
    input: RequestProfessionalSpecialtyInput
  ): Promise<ProfessionalSpecialtyResponseDTO> {
    const { professionalId, specialtyId } = input;

    // Ejecutar validaciones y persistencia dentro de una transacción serializada
    const created = await this.transactionRunner.run(async (tx) => {
      // 1. Bloqueo pesimista sobre el perfil del profesional para serializar solicitudes concurrentes
      // y prevenir sobrepasar la cuota máxima permitida (P1).
      await this.professionalProfilePort.lockProfileForUpdate(professionalId, tx);

      // 2. Verificar existencia y estado activo de la especialidad
      const specialty = await this.specialtyRepo.findById(specialtyId, tx);
      if (!specialty || !specialty.isActive) {
        throw new SpecialtyInactiveError(
          "La especialidad no existe o está desactivada"
        );
      }

      // 3. Verificar si ya existe relación previa
      const existing =
        await this.professionalSpecialtyRepo.findByProfessionalAndSpecialty(
          professionalId,
          specialtyId,
          tx
        );
      if (existing) {
        throw new ProfessionalSpecialtyAlreadyExistsError(
          "El profesional ya solicitó esta especialidad"
        );
      }

      // 4. Limitar pendientes (máximo 2 simultáneas) bajo el lock adquirido
      const pendingCount =
        await this.professionalSpecialtyRepo.countPendingByProfessional(
          professionalId,
          tx
        );
      if (pendingCount >= 2) {
        throw new MaxPendingSpecialtiesExceededError(
          "No puedes solicitar más de 2 especialidades pendientes"
        );
      }

      // 5. Crear entidad y persistir
      const request = ProfessionalSpecialty.createRequest(
        professionalId,
        specialtyId
      );
      return this.professionalSpecialtyRepo.save(request, tx);
    });

    // 6. Notificación post-commit best-effort (la notificación no determina el commit)
    try {
      await this.notificationPort.notifySpecialtyRequested(professionalId);
    } catch (err) {
      console.error(
        "Fallo observable en notificación post-commit de solicitud de especialidad:",
        {
          professionalId,
          specialtyId,
          error: err,
        }
      );
    }

    return {
      professionalId: created.professionalId,
      specialtyId: created.specialtyId,
      status: created.status,
      requestedAt: created.requestedAt,
      reviewedAt: created.reviewedAt,
    };
  }
}
