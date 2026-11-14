/// ARCHIVO: src/modules/catalog/application/use-cases/list-active-specialties.use-case.ts
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { PublicSpecialtyDTO, toPublicSpecialtyDTO } from "../dto/public-catalog.dto";

export class ListActiveSpecialtiesUseCase {
  constructor(private readonly specialtyRepo: SpecialtyRepository) {}

  async execute(txContext?: TransactionContext): Promise<PublicSpecialtyDTO[]> {
    const list = await this.specialtyRepo.listActive(txContext);
    return list.map(toPublicSpecialtyDTO);
  }
}
