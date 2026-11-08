/// ARCHIVO: src/modules/profiles/application/use-cases/update-avatar.use-case.ts
/// Caso de uso: Actualizar avatar de usuario desacoplado de fs/path mediante StoragePort (Misión 5 - Fase 4).

import { Role } from "@prisma/client";
import { StoragePort } from "../ports/storage.port";
import { ClientProfileRepository } from "../ports/client-profile-repository.port";
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { AdminProfileRepository } from "../ports/admin-profile-repository.port";
import {
  ClientProfileNotFoundError,
  ProfessionalProfileNotFoundError,
  AdminProfileNotFoundError,
  UnsupportedRoleError,
} from "../../domain/profile-errors";

export interface UpdateAvatarCommand {
  userId: number;
  role: Role;
  newAvatar: string;
}

export class UpdateAvatarUseCase {
  constructor(
    private readonly clientProfileRepo: ClientProfileRepository,
    private readonly professionalProfileRepo: ProfessionalProfileRepository,
    private readonly adminProfileRepo: AdminProfileRepository,
    private readonly storagePort: StoragePort
  ) { }

  async execute(command: UpdateAvatarCommand): Promise<{ avatar: string }> {
    const { userId, role, newAvatar } = command;

    let oldAvatar: string | null = null;

    try {
      switch (role) {
        case "CLIENT": {
          const profile = await this.clientProfileRepo.findByUserId(userId);
          if (!profile) {
            throw new ClientProfileNotFoundError("Perfil de cliente no existe");
          }
          oldAvatar = profile.avatar;
          await this.clientProfileRepo.updateAvatar(userId, newAvatar);
          break;
        }

        case "PROFESSIONAL": {
          const profile = await this.professionalProfileRepo.findByUserId(userId);
          if (!profile) {
            throw new ProfessionalProfileNotFoundError(
              "Perfil profesional no existe"
            );
          }
          oldAvatar = profile.avatar;
          await this.professionalProfileRepo.updateAvatar(userId, newAvatar);
          break;
        }

        case "ADMIN": {
          const profile = await this.adminProfileRepo.findByUserId(userId);
          if (!profile) {
            throw new AdminProfileNotFoundError("Perfil admin no existe");
          }
          oldAvatar = profile.avatar;
          await this.adminProfileRepo.updateAvatar(userId, newAvatar);
          break;
        }

        default:
          throw new UnsupportedRoleError("Rol no soportado");
      }
    } catch (error) {
      // Si la validación o persistencia falla, intentamos limpiar el nuevo archivo subido
      // para evitar huérfanos, preservando intacto el avatar anterior
      try {
        await this.storagePort.deleteFile(newAvatar);
      } catch (cleanupErr) {
        console.warn("No se pudo limpiar archivo nuevo tras fallo:", cleanupErr);
      }
      throw error;
    }

    // Limpieza del avatar anterior si existía y es distinto
    if (oldAvatar && oldAvatar !== newAvatar) {
      try {
        await this.storagePort.deleteFile(oldAvatar);
      } catch (err) {
        // Fallo de borrado en storage no debe revertir el avatar guardado exitosamente
        console.warn("No se pudo eliminar el avatar antiguo del storage:", err);
      }
    }

    return { avatar: newAvatar };
  }
}

