/// ARCHIVO: src/modules/catalog/application/ports/catalog-reader.port.ts
/// Contrato público de lectura de ofertas reservables para consumo inter-módulos (Misión 5).
///
/// Desacopla Appointments de la infraestructura Prisma del catálogo: Appointments describe la
/// necesidad de reservar una oferta por identificadores y Catalog aporta el adaptador. La lectura
/// es tenant-aware y verifica la afiliación activa (D3) y la reservabilidad de la oferta (D6).

import { TransactionContext } from "@/shared/types/transaction-context";

/// Moneda base unificada de la plataforma (D0/D7). El soporte multimoneda queda diferido.
export const BOOKABLE_SERVICE_CURRENCY = "MXN" as const;

/// Proyección tipada de una oferta reservable, ya verificada para el servicio, profesional y
/// tenant/afiliación solicitados. No expone el modelo Prisma ni detalles de persistencia.
export interface BookableService {
  id: number;
  /// Profesional titular verificado (coincide con el solicitado y con la afiliación).
  professionalProfileId: number;
  /// Afiliación profesional–tenant propietaria de la oferta (D3), verificada como ACTIVE.
  affiliationId: number;
  name: string;
  description: string;
  durationMin: number;
  /// D7: precio en MXN como string decimal con exactamente dos posiciones (ej. `"250.00"`).
  price: string;
  /// D0/D7: moneda base aprobada.
  currency: typeof BOOKABLE_SERVICE_CURRENCY;
  specialtyId: number;
}

export interface CatalogReader {
  /// Devuelve la oferta reservable solicitada o `null` si el servicio no existe, está inactivo,
  /// pertenece a otro profesional, su especialidad está desactivada (D6) o no es reservable en el
  /// tenant seleccionado (afiliación ausente/ no ACTIVE o fila legacy sin afiliación).
  ///
  /// El cuarto parámetro es un contexto transaccional opcional: cuando Appointments ya sostiene el
  /// lock de fila de la oferta (D5) debe propagarlo para que la lectura ocurra en la misma
  /// transacción. La firma requerida por Appointments son los tres primeros argumentos.
  getBookableService(
    serviceId: number,
    professionalId: number,
    tenantId: number,
    tx?: TransactionContext,
  ): Promise<BookableService | null>;
}
