/// ARCHIVO: src/modules/catalog/application/use-cases/list-professional-public-offers.use-case.ts
/// Caso de uso: proyección pública de las ofertas activas de un profesional en un tenant.
///
/// El alcance se deriva de la afiliación activa (D3): si el profesional no mantiene una afiliación
/// ACTIVE en el tenant, se devuelve `null` para responder 404 uniforme sin revelar su existencia.

import { ActiveAffiliationCheckerPort } from "../ports/active-affiliation-checker.port";
import { ServiceOfferRepository } from "../../domain/repositories/service-offer.repository";
import {
  ServiceOfferResponseDTO,
  toServiceOfferResponseDTO,
} from "../dto/service-offer.dto";

export interface ListProfessionalPublicOffersParams {
  profileId: number;
  tenantId: number;
}

export class ListProfessionalPublicOffersUseCase {
  constructor(
    private readonly affiliationChecker: ActiveAffiliationCheckerPort,
    private readonly offerRepo: ServiceOfferRepository,
  ) {}

  async execute(
    params: ListProfessionalPublicOffersParams,
  ): Promise<ServiceOfferResponseDTO[] | null> {
    const affiliationId = await this.affiliationChecker.findActiveAffiliationId(
      params.profileId,
      params.tenantId,
    );

    if (affiliationId === null) {
      return null;
    }

    const offers = await this.offerRepo.listActiveByAffiliation(affiliationId);
    return offers.map(toServiceOfferResponseDTO);
  }
}
