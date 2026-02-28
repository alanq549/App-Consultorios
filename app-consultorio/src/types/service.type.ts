/// src/types/service.types.ts
export interface Service {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  isActive: boolean;
  profileId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceSelectorProps {
  professionalId: number;
  onSelect: (serviceId: number) => void;
}