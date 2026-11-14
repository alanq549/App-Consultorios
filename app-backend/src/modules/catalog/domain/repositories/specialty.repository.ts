/// ARCHIVO: src/modules/catalog/domain/repositories/specialty.repository.ts
/// Contrato del repositorio de dominio para la entidad Specialty.
/// Sigue la convención del proyecto (domain/repositories) definida en ARCHITECTURE_REFACTOR.md:84.
/// Utiliza la abstracción única compartida TransactionContext (@/shared/types/transaction-context).

import { Specialty } from "../specialty.entity";
import { TransactionContext } from "@/shared/types/transaction-context";

export interface SpecialtyRepository {
  findById(id: number, txContext?: TransactionContext): Promise<Specialty | null>;
  findByName(name: string, txContext?: TransactionContext): Promise<Specialty | null>;
  listActive(txContext?: TransactionContext): Promise<Specialty[]>;
  listInactive(txContext?: TransactionContext): Promise<Specialty[]>;
  create(
    data: { name: string; description?: string | null; isActive?: boolean },
    txContext?: TransactionContext,
  ): Promise<Specialty>;
  update(
    id: number,
    data: { name?: string; description?: string | null; isActive?: boolean },
    txContext?: TransactionContext,
  ): Promise<Specialty>;
}

