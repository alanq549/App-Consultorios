// src/modules/admin/admin.controller.ts
import { Request, Response } from "express";
import { NotificationService } from "@/modules/notifications/notifications.service";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";
import { PrismaCatalogSpecialtyChecker } from "@/modules/profiles/infrastructure/prisma/prisma-catalog-specialty-checker";
import { ReviewProfessionalProfileUseCase } from "@/modules/profiles/application/use-cases/review-professional-profile.use-case";
import { SetProfessionalStatusUseCase } from "@/modules/profiles/application/use-cases/set-professional-status.use-case";
import { GetPendingProfilesUseCase } from "@/modules/profiles/application/use-cases/get-pending-profiles.use-case";
import { GetAllProfilesUseCase } from "@/modules/profiles/application/use-cases/get-all-profiles.use-case";
import {
  ProfileNotFoundError,
  InvalidProfileStatusTransitionError,
  ProfileMissingSpecialtyError,
} from "@/modules/profiles/domain/profile-errors";

const professionalProfileRepo = new PrismaProfessionalProfileRepository();
const specialtyChecker = new PrismaCatalogSpecialtyChecker();
const notificationAdapter = {
  notifyProfileApproved: (userId: number) =>
    NotificationService.notifyProfileApproved(userId),
  notifyProfileRejected: (userId: number) =>
    NotificationService.notifyProfileRejected(userId),
  notifyProfileSuspended: (userId: number) =>
    NotificationService.notifyProfileSuspended(userId),
};

const reviewProfessionalProfileUseCase = new ReviewProfessionalProfileUseCase(
  professionalProfileRepo,
  specialtyChecker,
  notificationAdapter
);

const setProfessionalStatusUseCase = new SetProfessionalStatusUseCase(
  professionalProfileRepo,
  specialtyChecker,
  notificationAdapter
);

const getPendingProfilesUseCase = new GetPendingProfilesUseCase(
  professionalProfileRepo
);

const getAllProfilesUseCase = new GetAllProfilesUseCase(
  professionalProfileRepo
);

export class AdminController {
  static async reviewProfessionalProfile(req: Request, res: Response) {
    try {
      const profileId = Number(req.params.profileId);
      const { status } = req.body;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({
          message: "Status inválido",
        });
      }

      const result = await reviewProfessionalProfileUseCase.execute({
        profileId,
        status,
      });

      return res.json({
        message: "Perfil revisado correctamente",
        profile: result,
      });
    } catch (error) {
      if (
        error instanceof InvalidProfileStatusTransitionError ||
        error instanceof ProfileMissingSpecialtyError
      ) {
        return res.status(400).json({
          message: error.message,
        });
      }
      if (error instanceof ProfileNotFoundError) {
        return res.status(404).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: "Error al revisar perfil",
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  static async getPendingProfiles(req: Request, res: Response) {
    try {
      const profiles = await getPendingProfilesUseCase.execute();
      return res.json(profiles);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener perfiles pendientes",
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  static async getAllProfiles(req: Request, res: Response) {
    try {
      const profiles = await getAllProfilesUseCase.execute();
      return res.json(profiles);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener perfiles",
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  static async setProfileStatus(req: Request, res: Response) {
    try {
      const profileId = Number(req.params.profileId);
      const { status } = req.body;

      if (!["APPROVED", "SUSPENDED"].includes(status)) {
        return res.status(400).json({
          message: "Status inválido",
        });
      }

      const result = await setProfessionalStatusUseCase.execute({
        profileId,
        status,
      });

      return res.json({
        message: "Estado del perfil actualizado correctamente",
        profile: result,
      });
    } catch (error) {
      if (
        error instanceof InvalidProfileStatusTransitionError ||
        error instanceof ProfileMissingSpecialtyError
      ) {
        return res.status(400).json({
          message: error.message,
        });
      }
      if (error instanceof ProfileNotFoundError) {
        return res.status(404).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: "Error al actualizar estado del perfil",
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
