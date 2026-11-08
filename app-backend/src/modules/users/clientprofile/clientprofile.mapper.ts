// src/modules/users/clientprofile/clientprofile.mapper.ts
import { ClientProfileResponseDTO } from "./clientprofile.dto";

export interface ClientProfileWithAppointmentsCount {
  id: number;
  name: string;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  _count?: {
    appointments: number;
  };
}

export class ClientProfileMapper {
  static toResponse(
    profile: ClientProfileWithAppointmentsCount
  ): ClientProfileResponseDTO {
    return {
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName ?? null,
      phone: profile.phone ?? null,
      avatar: profile.avatar ?? null,
      appointmentsCount: profile._count?.appointments ?? 0,
    };
  }
}
