/// ARCHIVO: src/modules/catalog/application/ports/professional-profile-lookup.port.ts
/// Puerto para consultar y bloquear ProfessionalProfile de Profiles desde Catalog.

import { TransactionContext } from "@/shared/types/transaction-context";

export interface ProfessionalProfilePort {
  /** Consulta el ID del perfil profesional dado el ID de usuario. */
  findProfileIdByUserId(
    userId: number,
    tx?: TransactionContext
  ): Promise<number | null>;

  /**
   * Adquiere un bloqueo pesimista a nivel de fila (FOR UPDATE) sobre el perfil
   * para serializar operaciones concurrentes (como la cuota de solicitudes de especialidad).
   */
  lockProfileForUpdate(
    profileId: number,
    tx: TransactionContext
  ): Promise<void>;
}
