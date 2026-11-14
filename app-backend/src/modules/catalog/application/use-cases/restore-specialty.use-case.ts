/// ARCHIVO: src/modules/catalog/application/use-cases/restore-specialty.use-case.ts
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { SpecialtyNotFoundError } from "../../domain/catalog-errors";
import { SpecialtyResponseDTO, toSpecialtyResponseDTO } from "../dto/specialty.dto";

export class RestoreSpecialtyUseCase {
  constructor(private readonly specialtyRepo: SpecialtyRepository) {}

  async execute(id: number, txContext?: TransactionContext): Promise<SpecialtyResponseDTO> {
    const existing = await this.specialtyRepo.findById(id, txContext);
    if (!existing) {
      throw new SpecialtyNotFoundError("Especialidad no encontrada");
    }

    const restored = await this.specialtyRepo.update(
      id,
      { isActive: true },
      txContext,
    );

    return toSpecialtyResponseDTO(restored);
  }
}
