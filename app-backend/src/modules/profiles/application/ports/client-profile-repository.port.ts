/// ARCHIVO: src/modules/profiles/application/ports/client-profile-repository.port.ts
import { ClientProfileDTO, UpdateClientProfileInput } from "../dtos/client-profile.dto";

export interface ClientProfileRepository {
  findByUserId(userId: number): Promise<ClientProfileDTO | null>;
  updateByUserId(userId: number, data: UpdateClientProfileInput): Promise<ClientProfileDTO>;
  updateAvatar(userId: number, avatar: string): Promise<void>;
}

