/// ARCHIVO: src/features/discovery/mappers/catalog.mapper.ts
import type { PublicServiceOffer } from "../types/catalog.types";

/**
 * Mapper para asegurar la consistencia de los datos de oferta en la UI.
 */
export const catalogMapper = {
  toOfferUI: (data: any): PublicServiceOffer => {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      durationMin: Number(data.durationMin),
      price: Number(data.price),
      priceFormatted: String(data.price),
      specialtyId: data.specialtyId,
      specialty: data.specialty || null,
    };
  },
};
