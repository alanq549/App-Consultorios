/// ARCHIVO: src/modules/catalog/application/ports/profile-suspension.port.ts
/// Puerto hacia Profiles para suspender el perfil profesional cuando pierde su última especialidad aprobada (Fase 4 / Fase 5 - D5).

import { TransactionContext } from "@/shared/types/transaction-context";

export interface ProfileSuspensionPort {
  /**
   * Ejecuta la suspensión si el profesional ya no tiene especialidades aprobadas,
   * operando dentro de la transacción compartida.
   * Retorna true si el perfil fue suspendido, false en caso contrario.
   */
  suspendIfNoApprovedSpecialties(
    professionalId: number,
    tx: TransactionContext
  ): Promise<boolean>;
}

