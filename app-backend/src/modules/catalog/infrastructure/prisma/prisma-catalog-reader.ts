/// ARCHIVO: src/modules/catalog/infrastructure/prisma/prisma-catalog-reader.ts
/// Adaptador Prisma del contrato `CatalogReader` (Misión 5).
///
/// Traduce la oferta reservable a la proyección estable `BookableService`, verificando en una sola
/// consulta: pertenencia al profesional solicitado, afiliación ACTIVE en el tenant seleccionado
/// (D3), oferta activa y especialidad activa (D6). Las filas legacy sin afiliación (D8) se tratan
/// como inexistentes para forzar el backfill.

import { TransactionContext } from "@/shared/types/transaction-context";
import {
  CatalogReader,
  BookableService,
  BOOKABLE_SERVICE_CURRENCY,
} from "../../application/ports/catalog-reader.port";
import { ServiceOffer } from "../../domain/offer/service-offer.entity";
import { extractPrismaClient } from "./prisma-transaction-context";

export class PrismaCatalogReader implements CatalogReader {
  async getBookableService(
    serviceId: number,
    professionalId: number,
    tenantId: number,
    txContext?: TransactionContext,
  ): Promise<BookableService | null> {
    const db = extractPrismaClient(txContext);

    const service = await db.service.findFirst({
      where: {
        id: serviceId,
        profileId: professionalId,
        isActive: true,
        // Filtro relacional: excluye filas legacy sin afiliación y exige afiliación ACTIVE del
        // mismo profesional en el tenant seleccionado (D3). La FK compuesta garantiza la
        // correspondencia `affiliation.professionalProfileId === profileId`.
        affiliation: {
          tenantId,
          status: "ACTIVE",
          professionalProfileId: professionalId,
        },
        // D6: una especialidad desactivada inhabilita la oferta para nuevas reservas.
        specialty: { isActive: true },
      },
      select: {
        id: true,
        profileId: true,
        affiliationId: true,
        name: true,
        description: true,
        durationMin: true,
        price: true,
        specialtyId: true,
      },
    });

    if (!service || service.affiliationId === null) {
      return null;
    }

    return {
      id: service.id,
      professionalProfileId: service.profileId,
      affiliationId: service.affiliationId,
      name: service.name,
      description: service.description,
      durationMin: service.durationMin,
      // D7: el `Decimal(10, 2)` se serializa como string exacto de dos posiciones, sin coerción a
      // `number` de punto flotante.
      price: ServiceOffer.formatPrice(service.price.toString()),
      currency: BOOKABLE_SERVICE_CURRENCY,
      specialtyId: service.specialtyId,
    };
  }
}
