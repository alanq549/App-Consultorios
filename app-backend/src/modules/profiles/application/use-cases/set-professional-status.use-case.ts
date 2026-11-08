/// ARCHIVO: src/modules/profiles/application/use-cases/set-professional-status.use-case.ts
/// Caso de uso: Cambiar estado (APPROVED | SUSPENDED) por ADMIN (Misión 4 - Fase 4).

import { ProfessionalStatus } from "@prisma/client";
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { CatalogSpecialtyChecker } from "../ports/catalog-specialty-checker.port";
import { ProfessionalStatusMachine } from "../../domain/professional-status-machine";
import { ProfessionalProfileNotFoundError } from "../../domain/profile-errors";
import { ProfileNotificationPort } from "./review-professional-profile.use-case";

export interface SetProfileStatusCommand {
  profileId: number;
  status: ProfessionalStatus;
}

export class SetProfessionalStatusUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository,
    private readonly specialtyChecker: CatalogSpecialtyChecker,
    private readonly notificationPort?: ProfileNotificationPort
  ) {}

  async execute(command: SetProfileStatusCommand) {
    const { profileId, status } = command;

    // Transición atómica con lock de fila en BD (serializa modificaciones concurrentes)
    const updated = await this.professionalProfileRepo.executeTransition(
      profileId,
      status,
      this.specialtyChecker
    );

    // Notificación post-commit best-effort (solo si hubo cambio de estado)
    if (
      this.notificationPort &&
      updated.previousStatus !== updated.verificationStatus
    ) {
      try {
        if (status === "APPROVED") {
          await this.notificationPort.notifyProfileApproved(updated.userId);
        } else if (status === "SUSPENDED") {
          await this.notificationPort.notifyProfileSuspended(updated.userId);
        }
      } catch (err) {
        console.error("Fallo observable en notificación post-commit:", {
          profileId,
          userId: updated.userId,
          status,
          error: err,
        });
      }
    }

    return updated;
  }
}

