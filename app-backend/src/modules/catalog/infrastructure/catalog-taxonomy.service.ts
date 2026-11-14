/// ARCHIVO: src/modules/catalog/infrastructure/catalog-taxonomy.service.ts
/// Implementación de CatalogTaxonomyContract para consumo inter-módulos.
/// Su instanciación y conexión con consumidores se gestiona desde el wiring de aplicación (src/app.wiring.ts).

import {
  CatalogTaxonomyContract,
  TaxonomySpecialtyDTO,
} from "../application/ports/catalog-taxonomy.contract";
import { SpecialtyRepository } from "../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { PrismaSpecialtyRepository } from "./prisma/prisma-specialty-repository";
import { SpecialtyInactiveError, SpecialtyNotFoundError } from "../domain/catalog-errors";

export class CatalogTaxonomyService implements CatalogTaxonomyContract {
  constructor(
    private readonly specialtyRepo: SpecialtyRepository = new PrismaSpecialtyRepository(),
  ) {}

  async findActiveById(
    id: number,
    txContext?: TransactionContext,
  ): Promise<TaxonomySpecialtyDTO | null> {
    const specialty = await this.specialtyRepo.findById(id, txContext);
    if (!specialty || !specialty.isActive) {
      return null;
    }
    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      isActive: specialty.isActive,
    };
  }

  async ensureActiveSpecialtyExists(
    id: number,
    txContext?: TransactionContext,
  ): Promise<TaxonomySpecialtyDTO> {
    const specialty = await this.specialtyRepo.findById(id, txContext);
    if (!specialty) {
      throw new SpecialtyNotFoundError("Especialidad no encontrada");
    }
    if (!specialty.isActive) {
      throw new SpecialtyInactiveError("La especialidad no existe o está desactivada");
    }
    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      isActive: specialty.isActive,
    };
  }
}
