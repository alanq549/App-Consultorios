/// ARCHIVO: src/modules/profiles/application/ports/admin-profile-repository.port.ts
import { AdminProfileDTO } from "../dtos/admin-profile.dto";

export interface AdminProfileRepository {
  findByUserId(userId: number): Promise<AdminProfileDTO | null>;
  updateAvatar(userId: number, avatar: string): Promise<void>;
}

