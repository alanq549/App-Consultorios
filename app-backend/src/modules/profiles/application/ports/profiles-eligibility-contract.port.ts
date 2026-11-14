/// ARCHIVO: src/modules/profiles/application/ports/profiles-eligibility-contract.port.ts
/// Contrato público exportado por Profiles para coordinación con Catalog (Fase 5 - Misión 2).

import { TransactionContext } from "@/shared/types/transaction-context";

export interface ProfilesEligibilityContract {
  /**
   * Resuelve el ID del perfil profesional asociado al usuario autenticado.
   * Admite opcionalmente un TransactionContext o fallback a lectura no transaccional.
   */
  findProfileIdByUserId(
    userId: number,
    txContext?: TransactionContext
  ): Promise<number | null>;

  /**
   * Adquiere bloqueo pesimista en PostgreSQL sobre el perfil para serializar
   * operaciones concurrentes dentro de la transacción externa.
   *
   * REQUIERE estrictamente un TransactionContext activo. No permite fallback a prisma global.
   */
  lockProfileForUpdate(
    profileId: number,
    txContext: TransactionContext
  ): Promise<void>;

  /**
   * Ejecuta la reconciliación atómica de suspensión si el profesional
   * quedó sin especialidades aprobadas (Fase 4 - D5).
   *
   * REQUIERE estrictamente un TransactionContext activo. No permite fallback a prisma global.
   */
  suspendOnSpecialtyRevoked(
    profileId: number,
    txContext: TransactionContext
  ): Promise<boolean>;
}
