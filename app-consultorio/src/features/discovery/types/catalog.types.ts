/// ARCHIVO: src/features/discovery/types/catalog.types.ts
/// Definiciones de tipos para el catálogo público basadas en los DTOs de Backend.

export interface PublicSpecialty {
  id: number;
  name: string;
  description: string | null;
}

export interface ProfessionalPublicSpecialty {
  specialtyId: number;
  name: string;
  description: string | null;
  specialty: {
    id: number;
    name: string;
    description: string | null;
  };
}

export interface PublicServiceOffer {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  price: number; // En el frontend preferimos number para cálculos
  priceFormatted: string; // El string decimal de backend (ej. "250.00")
  specialtyId: number;
  specialty?: { id: number; name: string } | null;
}
