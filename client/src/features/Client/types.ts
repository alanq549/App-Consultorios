export interface ClientProfile {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  isVerified: boolean;
}

export interface UpdateClientProfileDto {
  name?: string;
  lastName?: string;
  phone?: string;
  avatarFile?: File;
}
