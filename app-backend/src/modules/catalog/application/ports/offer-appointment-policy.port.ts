/// ARCHIVO: src/modules/catalog/application/ports/offer-appointment-policy.port.ts
/// Puerto de lectura de citas para la política de inmutabilidad y desactivación (D5).
///
/// Catalog no importa el módulo Appointments ni su Prisma: declara la necesidad de lectura y el
/// Composition Root provee el adaptador (sondeo temporal read-only hasta que Appointments exponga
/// su contrato en una fase posterior).

import { TransactionContext } from "@/shared/types/transaction-context";

export interface OfferAppointmentPolicyPort {
  /// Número total de citas asociadas a la oferta, en cualquier estado (histórico incluido).
  /// D5: si es mayor a cero, los términos contractuales quedan inmutables.
  countByService(
    serviceId: number,
    tx?: TransactionContext,
  ): Promise<number>;

  /// Indica si existe al menos una cita impeditiva de la desactivación (D5): estado no terminal
  /// (`PENDING`/`CONFIRMED`) cuyo instante de finalización `endDateTime > now`.
  hasBlockingAppointments(
    serviceId: number,
    now: Date,
    tx?: TransactionContext,
  ): Promise<boolean>;
}
