/// ARCHIVO: src/modules/catalog/application/ports/catalog-taxonomy.contract.ts
/// Contrato público de taxonomía para consumo inter-módulos.
/// Desacoplado de detalles de persistencia y clientes de base de datos específicos.

import { TransactionContext } from "@/shared/types/transaction-context";

export interface TaxonomySpecialtyDTO {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CatalogTaxonomyContract {
  findActiveById(
    id: number,
    txContext?: TransactionContext,
  ): Promise<TaxonomySpecialtyDTO | null>;

  ensureActiveSpecialtyExists(
    id: number,
    txContext?: TransactionContext,
  ): Promise<TaxonomySpecialtyDTO>;
}
