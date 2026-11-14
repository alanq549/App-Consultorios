/// ARCHIVO: src/modules/catalog/application/dto/service-offer.dto.ts
/// Contratos de entrada/salida de la oferta reservable (D3, D5, D7).

import { z } from "zod";
import {
  ServiceOffer,
  OFFER_MAX_DURATION_MIN,
  OFFER_SLOT_MINUTES,
} from "../../domain/offer/service-offer.entity";

/// D7: la entrada acepta string o número positivo con un máximo de 2 decimales.
/// La normalización canónica (rechazo sin redondeo) la aplica `ServiceOffer.normalizePrice`.
const priceInputSchema = z.union([z.string(), z.number()]);

export const CreateServiceOfferSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(500),
  durationMin: z
    .number()
    .int()
    .positive()
    .max(OFFER_MAX_DURATION_MIN)
    .refine((value) => value % OFFER_SLOT_MINUTES === 0, {
      message: "durationMin debe ser múltiplo de 15 minutos",
    }),
  price: priceInputSchema,
  specialtyId: z.number().int().positive(),
});

export type CreateServiceOfferDTO = z.infer<typeof CreateServiceOfferSchema>;

export const UpdateServiceOfferSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(5).max(500).optional(),
  durationMin: z
    .number()
    .int()
    .positive()
    .max(OFFER_MAX_DURATION_MIN)
    .refine((value) => value % OFFER_SLOT_MINUTES === 0, {
      message: "durationMin debe ser múltiplo de 15 minutos",
    })
    .optional(),
  price: priceInputSchema.optional(),
  specialtyId: z.number().int().positive().optional(),
});

export type UpdateServiceOfferDTO = z.infer<typeof UpdateServiceOfferSchema>;

export interface ServiceOfferResponseDTO {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  /// D7: string decimal con exactamente dos posiciones (ej. `"150.00"`), nunca `number`.
  price: string;
  isActive: boolean;
  profileId: number;
  affiliationId: number | null;
  specialtyId: number;
  specialty: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function toServiceOfferResponseDTO(offer: ServiceOffer): ServiceOfferResponseDTO {
  const snapshot = offer.toSnapshot();
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    durationMin: snapshot.durationMin,
    price: ServiceOffer.formatPrice(snapshot.price),
    isActive: snapshot.isActive,
    profileId: snapshot.profileId,
    affiliationId: snapshot.affiliationId,
    specialtyId: snapshot.specialtyId,
    specialty: snapshot.specialty ?? null,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}
