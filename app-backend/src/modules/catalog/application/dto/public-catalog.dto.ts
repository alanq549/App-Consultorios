/// ARCHIVO: src/modules/catalog/application/dto/public-catalog.dto.ts
/// DTOs para la exposición pública y segura del catálogo (Misión 6).
/// Garantizan el aislamiento por tenant y ocultan estados administrativos.

import { ServiceOffer } from "../../domain/offer/service-offer.entity";

export interface PublicSpecialtyDTO {
  id: number;
  name: string;
  description: string | null;
}

export interface ProfessionalPublicSpecialtyDTO {
  specialtyId: number;
  name: string;
  description: string | null;
  specialty: {
    id: number;
    name: string;
    description: string | null;
  };
}

export interface PublicServiceOfferDTO {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  price: string;
  specialtyId: number;
  specialty?: { id: number; name: string } | null;
}

export function toPublicSpecialtyDTO(specialty: {
  id: number;
  name: string;
  description?: string | null;
}): PublicSpecialtyDTO {
  return {
    id: specialty.id,
    name: specialty.name,
    description: specialty.description ?? null,
  };
}

export function toProfessionalPublicSpecialtyDTO(record: {
  specialtyId: number;
  specialty: {
    id: number;
    name: string;
    description?: string | null;
  };
}): ProfessionalPublicSpecialtyDTO {
  return {
    specialtyId: record.specialtyId,
    name: record.specialty.name,
    description: record.specialty.description ?? null,
    specialty: {
      id: record.specialty.id,
      name: record.specialty.name,
      description: record.specialty.description ?? null,
    },
  };
}

export function toPublicServiceOfferDTO(offer: {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  price: string;
  specialtyId: number;
  specialty?: { id: number; name: string } | null;
}): PublicServiceOfferDTO {
  return {
    id: offer.id,
    name: offer.name,
    description: offer.description,
    durationMin: offer.durationMin,
    price: ServiceOffer.formatPrice(offer.price),
    specialtyId: offer.specialtyId,
    specialty: offer.specialty ?? null,
  };
}
