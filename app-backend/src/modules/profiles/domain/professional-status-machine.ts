/// ARCHIVO: src/modules/profiles/domain/professional-status-machine.ts
/// Máquina de estados de dominio para el ciclo de vida de verificación global de ProfessionalProfile (Fase 4 - D4).

import { ProfessionalStatus } from "@prisma/client";
import {
  InvalidProfileStatusTransitionError,
  ProfileMissingSpecialtyError,
} from "./profile-errors";

export class ProfessionalStatusMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<
    ProfessionalStatus,
    readonly ProfessionalStatus[]
  > = {
    PENDING: ["APPROVED", "REJECTED"],
    APPROVED: ["SUSPENDED"],
    SUSPENDED: ["APPROVED"],
    REJECTED: [],
  };

  /**
   * Valida si la transición de estado es válida según las reglas de negocio de D4.
   * Si el estado actual es igual al nuevo, no requiere validación de transición (idempotente).
   */
  static validateTransition(
    currentStatus: ProfessionalStatus,
    nextStatus: ProfessionalStatus,
    approvedSpecialtiesCount: number
  ): void {
    if (currentStatus === nextStatus) {
      return;
    }

    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new InvalidProfileStatusTransitionError(currentStatus, nextStatus);
    }

    if (nextStatus === "APPROVED" && approvedSpecialtiesCount <= 0) {
      throw new ProfileMissingSpecialtyError();
    }
  }

  /**
   * Determina si una transición es válida sin lanzar excepciones.
   */
  static canTransition(
    currentStatus: ProfessionalStatus,
    nextStatus: ProfessionalStatus
  ): boolean {
    if (currentStatus === nextStatus) return true;
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    return !!allowed && allowed.includes(nextStatus);
  }
}

