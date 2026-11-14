/// ARCHIVO: src/modules/catalog/application/use-cases/list-inactive-specialties.use-case.ts
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { SpecialtyResponseDTO, toSpecialtyResponseDTO } from "../dto/specialty.dto";

export class ListInactiveSpecialtiesUseCase {
  constructor(private readonly specialtyRepo: SpecialtyRepository) {}

  async execute(txContext?: TransactionContext): Promise<SpecialtyResponseDTO[]> {
    const list = await this.specialtyRepo.listInactive(txContext);
    return list.map(toSpecialtyResponseDTO);
  }
}
