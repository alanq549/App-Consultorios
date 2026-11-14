/// ARCHIVO: src/modules/catalog/application/use-cases/review-professional-specialty.use-case.ts
/// Caso de uso: el ADMIN global aprueba o rechaza una especialidad asignada a un profesional (Catalog).

import { TransactionRunner } from "@/shared/types/transaction-context";
import { ProfessionalSpecialtyRepository } from "../../domain/repositories/professional-specialty.repository";
import { ProfileSuspensionPort } from "../ports/profile-suspension.port";
import { CatalogNotificationPort } from "../ports/catalog-notification.port";
import {
  ProfessionalSpecialtyNotFoundError,
  InvalidSpecialtyStatusError,
} from "../../domain/catalog-errors";
import { ReviewProfessionalSpecialtyInput } from "../dto/professional-specialty.dto";

export interface ReviewProfessionalSpecialtyResult {
  success: true;
}

export class ReviewProfessionalSpecialtyUseCase {
  constructor(
    private readonly professionalSpecialtyRepo: ProfessionalSpecialtyRepository,
    private readonly profileSuspensionPort: ProfileSuspensionPort,
    private readonly notificationPort: CatalogNotificationPort,
    private readonly transactionRunner: TransactionRunner
  ) {}

  async execute(
    input: ReviewProfessionalSpecialtyInput
  ): Promise<ReviewProfessionalSpecialtyResult> {
    const { professionalId, specialtyId, status: newStatus } = input;

    if (newStatus !== "APPROVED" && newStatus !== "REJECTED") {
      throw new InvalidSpecialtyStatusError("Estado de especialidad inválido");
    }

    // Ejecutar actualización de elegibilidad y reconciliación con Profiles dentro de la misma transacción
    const { profileSuspended } = await this.transactionRunner.run(async (tx) => {
      // 1. Verificar existencia de la asignación
      const relation =
        await this.professionalSpecialtyRepo.findByProfessionalAndSpecialty(
          professionalId,
          specialtyId,
          tx
        );

      if (!relation) {
        throw new ProfessionalSpecialtyNotFoundError(
          "La especialidad no está asignada al profesional"
        );
      }

      // 2. Validar transición de estado en el dominio (ej. REJECTED es terminal)
      relation.transitionTo(newStatus, new Date());

      // 3. Actualizar estado y fecha de revisión
      await this.professionalSpecialtyRepo.updateStatus(
        professionalId,
        specialtyId,
        newStatus,
        relation.reviewedAt,
        tx
      );

      // 4. Reconciliación atómica delegada a Profiles bajo la misma transacción (Fase 4 / Fase 5 - D5)
      // Si la suspensión arroja error o falla, la transacción de Catalog se revierte.
      const suspended =
        await this.profileSuspensionPort.suspendIfNoApprovedSpecialties(
          professionalId,
          tx
        );

      return { profileSuspended: suspended };
    });

    // 4. Notificaciones fuera de transacción (post-commit best-effort)
    try {
      if (newStatus === "APPROVED") {
        await this.notificationPort.notifySpecialtyApproved(professionalId);
      } else if (newStatus === "REJECTED") {
        await this.notificationPort.notifySpecialtyRejected(professionalId);
      }

      if (profileSuspended) {
        await this.notificationPort.notifyProfileSuspended(professionalId);
      }
    } catch (err) {
      console.error(
        "Fallo observable en notificación post-commit de especialidad:",
        {
          professionalId,
          specialtyId,
          newStatus,
          profileSuspended,
          error: err,
        }
      );
    }

    return { success: true };
  }
}
