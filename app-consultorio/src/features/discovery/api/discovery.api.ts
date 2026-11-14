/// ARCHIVO: src/features/discovery/api/discovery.api.ts
import api from "@/api/axios";
import type { 
  PublicSpecialty, 
  ProfessionalPublicSpecialty, 
  PublicServiceOffer 
} from "../types/catalog.types";

export const discoveryApi = {
  /**
   * Lista todas las especialidades activas (Taxonomía Global).
   */
  listSpecialties: async (): Promise<PublicSpecialty[]> => {
    const { data } = await api.get<PublicSpecialty[]>("/specialties");
    return data;
  },

  /**
   * Lista las especialidades aprobadas de un profesional en el tenant actual.
   */
  listProfessionalSpecialties: async (profileId: number): Promise<ProfessionalPublicSpecialty[]> => {
    const { data } = await api.get<ProfessionalPublicSpecialty[]>(
      `/specialties/professional/${profileId}`
    );
    return data;
  },

  /**
   * Lista las ofertas (servicios) activas de un profesional en el tenant actual.
   */
  listProfessionalOffers: async (profileId: number): Promise<PublicServiceOffer[]> => {
    const { data } = await api.get<any[]>(
      `/services/professional/${profileId}`
    );

    // Mapeo a tipos de frontend (el backend envía price como string decimal)
    return data.map((offer) => ({
      ...offer,
      price: Number(offer.price),
      priceFormatted: offer.price,
    }));
  },
};
