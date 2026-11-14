/// ARCHIVO: src/modules/catalog/application/use-cases/update-specialty.use-case.ts
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import {
  SpecialtyNotFoundError,
  DuplicateSpecialtyError,
} from "../../domain/catalog-errors";
import {
  UpdateSpecialtyDTO,
  SpecialtyResponseDTO,
  toSpecialtyResponseDTO,
} from "../dto/specialty.dto";

export class UpdateSpecialtyUseCase {
  constructor(private readonly specialtyRepo: SpecialtyRepository) {}

  async execute(
    id: number,
    dto: UpdateSpecialtyDTO,
    txContext?: TransactionContext,
  ): Promise<SpecialtyResponseDTO> {
    const existing = await this.specialtyRepo.findById(id, txContext);
    if (!existing) {
      throw new SpecialtyNotFoundError("Especialidad no encontrada");
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const withName = await this.specialtyRepo.findByName(trimmedName, txContext);
        if (withName && withName.id !== id) {
          throw new DuplicateSpecialtyError("Ya existe una especialidad con ese nombre");
        }
      }
    }

    const updated = await this.specialtyRepo.update(
      id,
      {
        name: dto.name?.trim(),
        description: dto.description !== undefined ? dto.description : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
      txContext,
    );

    return toSpecialtyResponseDTO(updated);
  }
}
