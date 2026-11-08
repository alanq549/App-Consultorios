/// ARCHIVO: src/modules/profiles/application/dtos/admin-profile.dto.ts

export interface AdminProfileDTO {
  id: number;
  userId: number;
  name: string;
  lastName: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

