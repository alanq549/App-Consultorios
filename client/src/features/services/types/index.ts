
export interface UpdateServiceDTO {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface ServiceFormDTO {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
}

export type CreateServiceDTO = ServiceFormDTO;

export interface UpdateServiceDTO extends Partial<ServiceFormDTO> {
  isActive?: boolean;
}
