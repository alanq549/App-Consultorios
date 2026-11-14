/// ARCHIVO: src/modules/catalog/domain/repositories/service-offer.repository.ts
/// Contrato del repositorio de dominio para la oferta reservable (ServiceOffer, D3).
/// Usa la abstracción compartida TransactionContext (@/shared/types/transaction-context).

import { TransactionContext } from "@/shared/types/transaction-context";
import { ServiceOffer } from "../offer/service-offer.entity";

export interface CreateServiceOfferData {
  name: string;
  description: string;
  durationMin: number;
  /// Precio normalizado a string decimal de dos posiciones (D7).
  price: string;
  profileId: number;
  /// Afiliación propietaria (D3); toda oferta nueva se crea con afiliación explícita.
  affiliationId: number;
  specialtyId: number;
}

export interface UpdateServiceOfferData {
  name?: string;
  description?: string;
  durationMin?: number;
  price?: string;
  isActive?: boolean;
  specialtyId?: number;
}

export interface ServiceOfferRepository {
  findById(id: number, tx?: TransactionContext): Promise<ServiceOffer | null>;

  /// Busca una oferta por nombre dentro de la afiliación. Considera también las inactivas para
  /// reflejar el invariante de unicidad `@@unique([affiliationId, name])` (D3).
  findByNameInAffiliation(
    affiliationId: number,
    name: string,
    excludeId?: number,
    tx?: TransactionContext,
  ): Promise<ServiceOffer | null>;

  /// Lista las ofertas activas de una afiliación (superficie pública del catálogo).
  listActiveByAffiliation(
    affiliationId: number,
    tx?: TransactionContext,
  ): Promise<ServiceOffer[]>;

  create(
    data: CreateServiceOfferData,
    tx?: TransactionContext,
  ): Promise<ServiceOffer>;

  update(
    id: number,
    data: UpdateServiceOfferData,
    tx?: TransactionContext,
  ): Promise<ServiceOffer>;

  /// Soft-delete: marca `isActive = false` conservando la fila para historial y facturación.
  deactivate(id: number, tx?: TransactionContext): Promise<ServiceOffer>;

  /// Bloqueo pesimista de la fila de la oferta (`SELECT ... FOR UPDATE`).
  ///
  /// Serializa la comprobación de citas (D5) con la creación de citas en Appointments: ambas
  /// operaciones adquieren el mismo lock de fila sobre `Service`, de modo que una reserva
  /// concurrente no pueda colarse entre el conteo de citas y la mutación de la oferta. Requiere
  /// ejecutarse dentro de una transacción; el adaptador rechaza el fallback al cliente global.
  lockForUpdate(id: number, tx?: TransactionContext): Promise<void>;
}
