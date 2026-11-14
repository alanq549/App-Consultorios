/// ARCHIVO: src/modules/catalog/application/use-cases/list-active-specialties.use-case.ts
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { SpecialtyResponseDTO, toSpecialtyResponseDTO } from "../dto/specialty.dto";

export class ListActiveSpecialtiesUseCase {
  constructor(private readonly specialtyRepo: SpecialtyRepository) {}

  async execute(txContext?: TransactionContext): Promise<SpecialtyResponseDTO[]> {
    const list = await this.specialtyRepo.listActive(txContext);
    return list.map(toSpecialtyResponseDTO);
  }
}
