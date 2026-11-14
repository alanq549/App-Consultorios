/// ARCHIVO: src/modules/catalog/application/use-cases/create-specialty.use-case.ts
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { DuplicateSpecialtyError } from "../../domain/catalog-errors";
import {
  CreateSpecialtyDTO,
  SpecialtyResponseDTO,
  toSpecialtyResponseDTO,
} from "../dto/specialty.dto";

export class CreateSpecialtyUseCase {
  constructor(private readonly specialtyRepo: SpecialtyRepository) {}

  async execute(
    dto: CreateSpecialtyDTO,
    txContext?: TransactionContext,
  ): Promise<SpecialtyResponseDTO> {
    const trimmedName = dto.name.trim();
    const existing = await this.specialtyRepo.findByName(trimmedName, txContext);

    if (existing && existing.isActive) {
      throw new DuplicateSpecialtyError("La especialidad ya existe");
    }

    if (existing && !existing.isActive) {
      const reactivated = await this.specialtyRepo.update(
        existing.id,
        {
          name: trimmedName,
          description: dto.description !== undefined ? dto.description : existing.description,
          isActive: true,
        },
        txContext,
      );
      return toSpecialtyResponseDTO(reactivated);
    }

    const created = await this.specialtyRepo.create(
      {
        name: trimmedName,
        description: dto.description ?? null,
        isActive: true,
      },
      txContext,
    );

    return toSpecialtyResponseDTO(created);
  }
}
