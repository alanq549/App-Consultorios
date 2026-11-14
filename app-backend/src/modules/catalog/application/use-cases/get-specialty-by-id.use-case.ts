/// ARCHIVO: src/modules/catalog/application/use-cases/get-specialty-by-id.use-case.ts
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { SpecialtyNotFoundError } from "../../domain/catalog-errors";
import { SpecialtyResponseDTO, toSpecialtyResponseDTO } from "../dto/specialty.dto";

export class GetSpecialtyByIdUseCase {
  constructor(private readonly specialtyRepo: SpecialtyRepository) {}

  async execute(id: number, txContext?: TransactionContext): Promise<SpecialtyResponseDTO> {
    const specialty = await this.specialtyRepo.findById(id, txContext);
    if (!specialty) {
      throw new SpecialtyNotFoundError("Especialidad no encontrada");
    }
    return toSpecialtyResponseDTO(specialty);
  }
}
