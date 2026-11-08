/// ARCHIVO: src/modules/profiles/application/dtos/client-profile.dto.ts

export interface ClientProfileDTO {
  id: number;
  name: string;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  appointmentsCount: number;
}

export interface UpdateClientProfileInput {
  name?: string;
  lastName?: string;
  phone?: string;
}

