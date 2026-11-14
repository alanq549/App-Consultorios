/// ARCHIVO: src/modules/catalog/application/use-cases/create-service-offer.use-case.ts
/// Caso de uso: crear una oferta reservable bajo la afiliación del profesional (D3, D4, D7).

import { TransactionRunner } from "@/shared/types/transaction-context";
import { ServiceOfferRepository } from "../../domain/repositories/service-offer.repository";
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { ProfessionalSpecialtyRepository } from "../../domain/repositories/professional-specialty.repository";
import { OfferWriteContextPort } from "../ports/offer-write-context.port";
import { ServiceOffer } from "../../domain/offer/service-offer.entity";
import {
  UnauthorizedAffiliationActionError,
  ServiceOfferNameAlreadyExistsError,
  SpecialtyInactiveError,
} from "../../domain/catalog-errors";
import {
  CreateServiceOfferDTO,
  ServiceOfferResponseDTO,
  toServiceOfferResponseDTO,
} from "../dto/service-offer.dto";

export interface CreateServiceOfferInput {
  userId: number;
  tenantId: number;
  data: CreateServiceOfferDTO;
}

export class CreateServiceOfferUseCase {
  constructor(
    private readonly offerRepo: ServiceOfferRepository,
    private readonly specialtyRepo: SpecialtyRepository,
    private readonly professionalSpecialtyRepo: ProfessionalSpecialtyRepository,
    private readonly writeContext: OfferWriteContextPort,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: CreateServiceOfferInput): Promise<ServiceOfferResponseDTO> {
    const { userId, tenantId, data } = input;

    /// D7 / invariantes de duración: se validan antes de abrir la transacción para no gastar
    /// conexión en payloads inválidos.
    const price = ServiceOffer.normalizePrice(data.price);
    ServiceOffer.assertDuration(data.durationMin);

    const created = await this.transactionRunner.run(async (tx) => {
      const ctx = await this.writeContext.resolve({ userId, tenantId, tx });

      if (
        ctx.professionalProfileId === null ||
        !ctx.profileApproved ||
        !ctx.membershipActive ||
        ctx.affiliationId === null
      ) {
        throw new UnauthorizedAffiliationActionError();
      }

      const professionalProfileId = ctx.professionalProfileId;
      const affiliationId = ctx.affiliationId;

      const specialty = await this.specialtyRepo.findById(data.specialtyId, tx);
      if (!specialty || !specialty.isActive) {
        throw new SpecialtyInactiveError();
      }

      const eligibility =
        await this.professionalSpecialtyRepo.findByProfessionalAndSpecialty(
          professionalProfileId,
          data.specialtyId,
          tx,
        );
      if (!eligibility || !eligibility.isApproved()) {
        throw new UnauthorizedAffiliationActionError(
          "El profesional no tiene aprobada esta especialidad",
        );
      }

      const existing = await this.offerRepo.findByNameInAffiliation(
        affiliationId,
        data.name,
        undefined,
        tx,
      );
      if (existing) {
        throw new ServiceOfferNameAlreadyExistsError();
      }

      return this.offerRepo.create(
        {
          name: data.name,
          description: data.description,
          durationMin: data.durationMin,
          price,
          profileId: professionalProfileId,
          affiliationId,
          specialtyId: data.specialtyId,
        },
        tx,
      );
    });

    return toServiceOfferResponseDTO(created);
  }
}
