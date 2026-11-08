/// ARCHIVO: src/modules/profiles/application/use-cases/review-professional-profile.use-case.ts
/// Caso de uso: Revisión de perfil profesional por ADMIN (Misión 4 - Fase 4).

import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { CatalogSpecialtyChecker } from "../ports/catalog-specialty-checker.port";
import { ProfessionalStatusMachine } from "../../domain/professional-status-machine";
import { ProfessionalProfileNotFoundError } from "../../domain/profile-errors";

export interface ReviewProfileCommand {
  profileId: number;
  status: "APPROVED" | "REJECTED";
}

export interface ProfileNotificationPort {
  notifyProfileApproved(userId: number): Promise<unknown>;
  notifyProfileRejected(userId: number): Promise<unknown>;
  notifyProfileSuspended(userId: number): Promise<unknown>;
}

export class ReviewProfessionalProfileUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository,
    private readonly specialtyChecker: CatalogSpecialtyChecker,
    private readonly notificationPort?: ProfileNotificationPort
  ) {}

  async execute(command: ReviewProfileCommand) {
    const { profileId, status } = command;

    // Transición atómica con lock de fila en BD (serializa revisiones concurrentes y prerrequisitos de specialty)
    const updated = await this.professionalProfileRepo.executeTransition(
      profileId,
      status,
      this.specialtyChecker
    );

    // Notificación post-commit best-effort (solo si el estado cambió efectivamente)
    if (
      this.notificationPort &&
      updated.previousStatus !== updated.verificationStatus
    ) {
      try {
        if (status === "APPROVED") {
          await this.notificationPort.notifyProfileApproved(updated.userId);
        } else if (status === "REJECTED") {
          await this.notificationPort.notifyProfileRejected(updated.userId);
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
