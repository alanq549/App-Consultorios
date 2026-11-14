/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-profiles-eligibility-service.ts
/// Implementación de ProfilesEligibilityContract en la infraestructura de Profiles.

import { TransactionContext } from "@/shared/types/transaction-context";
import {
  extractPrismaClientFromContext,
  InvalidTransactionContextError,
} from "@/shared/database/prisma-transaction-context";
import { ProfilesEligibilityContract } from "../../application/ports/profiles-eligibility-contract.port";
import { SuspendOnSpecialtyRevokedUseCase } from "../../application/use-cases/suspend-on-specialty-revoked.use-case";
import { PrismaProfessionalProfileRepository } from "./prisma-professional-profile-repository";
import { PrismaCatalogSpecialtyChecker } from "./prisma-catalog-specialty-checker";

export class PrismaProfilesEligibilityService
  implements ProfilesEligibilityContract
{
  private readonly suspendUseCase: SuspendOnSpecialtyRevokedUseCase;

  constructor(suspendUseCase?: SuspendOnSpecialtyRevokedUseCase) {
    if (suspendUseCase) {
      this.suspendUseCase = suspendUseCase;
    } else {
      const repo = new PrismaProfessionalProfileRepository();
      const checker = new PrismaCatalogSpecialtyChecker();
      this.suspendUseCase = new SuspendOnSpecialtyRevokedUseCase(repo, checker);
    }
  }

  async findProfileIdByUserId(
    userId: number,
    txContext?: TransactionContext
  ): Promise<number | null> {
    // Lookup opcional: es una lectura simple que sí admite ejecutarse fuera de transacción.
    const db = extractPrismaClientFromContext(txContext);
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile ? profile.id : null;
  }

  async lockProfileForUpdate(
    profileId: number,
    txContext: TransactionContext
  ): Promise<void> {
    const db = this.requireTransactionalClient(
      txContext,
      "lockProfileForUpdate"
    );
    await db.$queryRaw`
      SELECT id FROM "ProfessionalProfile" WHERE id = ${profileId} FOR UPDATE
    `;
  }

  async suspendOnSpecialtyRevoked(
    profileId: number,
    txContext: TransactionContext
  ): Promise<boolean> {
    const db = this.requireTransactionalClient(
      txContext,
      "suspendOnSpecialtyRevoked"
    );
    return this.suspendUseCase.execute(profileId, db);
  }

  /**
   * Exige un TransactionContext válido y extrae su cliente transaccional.
   *
   * No permite el fallback al cliente Prisma global: operaciones como el bloqueo
   * `FOR UPDATE` deben ejecutarse dentro de la unidad de trabajo que protege la cuota;
   * degradar silenciosamente a una conexión auto-commit anularía el bloqueo.
   */
  private requireTransactionalClient(
    txContext: TransactionContext | undefined,
    operation: string
  ) {
    if (!txContext) {
      throw new InvalidTransactionContextError(
        `[Profiles] ${operation} requiere un TransactionContext activo. ` +
          "Se rechazó el fallback al cliente Prisma global para no ejecutar la operación fuera de la transacción prevista."
      );
    }
    return extractPrismaClientFromContext(txContext);
  }
}
