// src/modules/users/users.service.ts
import { Role } from "@prisma/client";
import { UpdateProfileInput } from "./users.types";
import { PrismaUserIdentityReader } from "@/modules/profiles/infrastructure/prisma/prisma-user-identity-reader";
import { PrismaClientProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-client-profile-repository";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";
import { PrismaAdminProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-admin-profile-repository";
import { PrismaUserConfigReader } from "@/modules/profiles/infrastructure/prisma/prisma-user-config-reader";
import { LocalStorageAdapter } from "@/modules/profiles/infrastructure/storage/local-storage.adapter";
import { GetCurrentUserUseCase } from "@/modules/profiles/application/use-cases/get-current-user.use-case";
import { UpdateClientProfileUseCase } from "@/modules/profiles/application/use-cases/update-client-profile.use-case";
import { UpdateProfessionalProfileUseCase } from "@/modules/profiles/application/use-cases/update-professional-profile.use-case";
import { UpdateAvatarUseCase } from "@/modules/profiles/application/use-cases/update-avatar.use-case";

const identityReader = new PrismaUserIdentityReader();
const clientProfileRepo = new PrismaClientProfileRepository();
const professionalProfileRepo = new PrismaProfessionalProfileRepository();
const adminProfileRepo = new PrismaAdminProfileRepository();
const configReader = new PrismaUserConfigReader();
const storageAdapter = new LocalStorageAdapter();

const getCurrentUserUseCase = new GetCurrentUserUseCase(
  identityReader,
  clientProfileRepo,
  professionalProfileRepo,
  adminProfileRepo,
  configReader
);

const updateClientProfileUseCase = new UpdateClientProfileUseCase(
  clientProfileRepo
);
const updateProfessionalProfileUseCase = new UpdateProfessionalProfileUseCase(
  professionalProfileRepo
);
const updateAvatarUseCase = new UpdateAvatarUseCase(
  clientProfileRepo,
  professionalProfileRepo,
  adminProfileRepo,
  storageAdapter
);

/**
 * @deprecated Fachada legacy de compatibilidad. Los endpoints y consumidores deben invocar
 * directamente los Casos de Uso del módulo `profiles` (`GetCurrentUserUseCase`,
 * `UpdateClientProfileUseCase`, `UpdateProfessionalProfileUseCase`, `UpdateAvatarUseCase`).
 */
export class UsersService {
  static async me(userId: number, role: Role) {
    return getCurrentUserUseCase.execute({ userId, role });
  }

  static async updateAvatar(userId: number, role: Role, newAvatar: string) {
    return updateAvatarUseCase.execute({ userId, role, newAvatar });
  }

  static async updateProfile(
    userId: number,
    role: Role,
    data: UpdateProfileInput
  ) {
    if (role === "CLIENT") {
      return updateClientProfileUseCase.execute(userId, data);
    }
    if (role === "PROFESSIONAL") {
      return updateProfessionalProfileUseCase.execute(userId, data);
    }
    throw new Error("Rol no soportado");
  }
}
