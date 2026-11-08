/// ARCHIVO: src/modules/profiles/application/use-cases/suspend-on-specialty-revoked.use-case.ts
/// Contrato transaccional de Profiles para Catalog (Fase 4 / Fase 5 - D5).
/// Recibe el cliente transaccional abierto por Catalog, NO abre una transacción propia.

import { ProfessionalProfileRepository } from "../ports/professional-profile-repository.port";
import { CatalogSpecialtyChecker } from "../ports/catalog-specialty-checker.port";

export class SuspendOnSpecialtyRevokedUseCase {
  constructor(
    private readonly professionalProfileRepo: ProfessionalProfileRepository,
    private readonly specialtyChecker: CatalogSpecialtyChecker
  ) {}

  /**
   * Ejecuta la suspensión si el profesional ya no tiene especialidades aprobadas,
   * operando dentro de la transacción externa pasada por `txClient`.
   *
   * POLÍTICA DE DOMINIO Y CONCURRENCIA (D4 / D5):
   * Reconcilia la suspensión bajo row-level lock (FOR UPDATE) en PostgreSQL sobre el perfil:
   * - Si un admin intenta aprobar concurrentemente, debe esperar a que esta transacción concluya.
   * - Solo un perfil actualmente APPROVED se suspende si queda sin especialidades aprobadas.
   * - Si está en REJECTED (estado terminal), no debe alterarse su lifecycle.
   * - Si está en PENDING, no ha sido aprobado aún y no debe suspenderse.
   * - Si ya está en SUSPENDED, es un no-op idempotente.
   */
  async execute(profileId: number, txClient: unknown): Promise<boolean> {
    const result =
      await this.professionalProfileRepo.reconcileSpecialtyRevocation(
        profileId,
        this.specialtyChecker,
        txClient
      );

    return result.profileSuspended;
  }
}

