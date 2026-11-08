/// ARCHIVO: src/modules/profiles/application/use-cases/get-current-user.use-case.ts
/// Caso de uso: Obtener el perfil y configuración del usuario autenticado (Misión 1 - Fase 4).

import { Role } from "@prisma/client";
import { UserIdentityReader } from "../ports/user-identity-reader.port";
import { ClientProfileRepository } from "../ports/client-profile-repository.port";
import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { AdminProfileRepository } from "../ports/admin-profile-repository.port";
import { UserConfigReader } from "../ports/user-config-reader.port";
import { GetCurrentUserResponseDTO } from "../dtos/get-current-user.dto";
import {
  UserProfileNotFoundError,
  ClientProfileNotFoundError,
  ProfessionalProfileNotFoundError,
  AdminProfileNotFoundError,
  UnsupportedRoleError,
} from "../../domain/profile-errors";

export interface GetCurrentUserCommand {
  userId: number;
  role: Role;
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly identityReader: UserIdentityReader,
    private readonly clientProfileRepo: ClientProfileRepository,
    private readonly professionalProfileRepo: ProfessionalProfileRepository,
    private readonly adminProfileRepo: AdminProfileRepository,
    private readonly configReader: UserConfigReader
  ) {}

  async execute(command: GetCurrentUserCommand): Promise<GetCurrentUserResponseDTO> {
    const { userId, role } = command;

    const user = await this.identityReader.findById(userId);
    if (!user) {
      throw new UserProfileNotFoundError("Usuario no existe");
    }

    const config = await this.configReader.getConfig(userId);

    let profile: unknown;

    switch (role) {
      case "CLIENT": {
        const clientProfile = await this.clientProfileRepo.findByUserId(userId);
        if (!clientProfile) {
          throw new ClientProfileNotFoundError("Perfil de cliente no existe");
        }
        profile = clientProfile;
        break;
      }

      case "PROFESSIONAL": {
        const professionalProfile =
          await this.professionalProfileRepo.findByUserId(userId);
        if (!professionalProfile) {
          throw new ProfessionalProfileNotFoundError(
            "Perfil profesional no existe"
          );
        }
        profile = professionalProfile;
        break;
      }

      case "ADMIN": {
        const adminProfile = await this.adminProfileRepo.findByUserId(userId);
        if (!adminProfile) {
          throw new AdminProfileNotFoundError("Perfil admin no existe");
        }
        profile = adminProfile;
        break;
      }

      default:
        throw new UnsupportedRoleError("Rol no soportado");
    }

    return {
      role,
      email: user.email,
      isVerified: user.isVerified,
      profile,
      config,
    };
  }
}

