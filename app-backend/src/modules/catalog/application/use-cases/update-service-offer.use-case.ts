/// ARCHIVO: src/modules/catalog/application/use-cases/update-service-offer.use-case.ts
/// Caso de uso: actualizar una oferta reservable (D4, D5, D7).
///
/// D5: si la oferta ya tiene cualquier cita asociada, los términos contractuales
/// (`price`, `durationMin`, `specialtyId`) quedan inmutables; sólo se permite editar campos
/// descriptivos.

import { TransactionRunner } from "@/shared/types/transaction-context";
import { ServiceOfferRepository } from "../../domain/repositories/service-offer.repository";
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { ProfessionalSpecialtyRepository } from "../../domain/repositories/professional-specialty.repository";
import { OfferWriteContextPort } from "../ports/offer-write-context.port";
import { OfferAppointmentPolicyPort } from "../ports/offer-appointment-policy.port";
import { ServiceOffer } from "../../domain/offer/service-offer.entity";
import {
  UnauthorizedAffiliationActionError,
  ServiceOfferNotFoundError,
  ServiceOfferNameAlreadyExistsError,
  SpecialtyInactiveError,
  ServiceImmutableTermsWithAppointmentsError,
} from "../../domain/catalog-errors";
import {
  UpdateServiceOfferDTO,
  ServiceOfferResponseDTO,
  toServiceOfferResponseDTO,
} from "../dto/service-offer.dto";

export interface UpdateServiceOfferInput {
  userId: number;
  tenantId: number;
  offerId: number;
  data: UpdateServiceOfferDTO;
}

export class UpdateServiceOfferUseCase {
  constructor(
    private readonly offerRepo: ServiceOfferRepository,
    private readonly specialtyRepo: SpecialtyRepository,
    private readonly professionalSpecialtyRepo: ProfessionalSpecialtyRepository,
    private readonly writeContext: OfferWriteContextPort,
    private readonly appointmentPolicy: OfferAppointmentPolicyPort,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: UpdateServiceOfferInput): Promise<ServiceOfferResponseDTO> {
    const { userId, tenantId, offerId, data } = input;

    const price =
      data.price !== undefined ? ServiceOffer.normalizePrice(data.price) : undefined;
    if (data.durationMin !== undefined) {
      ServiceOffer.assertDuration(data.durationMin);
    }

    const updated = await this.transactionRunner.run(async (tx) => {
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

      /// Serialización D5: se toma el lock de fila de la oferta ANTES de leerla y de contar
      /// citas. Appointments adquiere el mismo lock antes de crear una cita, de modo que no
      /// puede colarse una reserva entre la comprobación de citas y la mutación de términos.
      await this.offerRepo.lockForUpdate(offerId, tx);

      /// Ownership estricto (D3): una oferta de otra afiliación o de otro tenant es
      /// indistinguible de una inexistente (404 uniforme, sin filtrar existencia).
      const offer = await this.offerRepo.findById(offerId, tx);
      if (
        !offer ||
        offer.affiliationId === null ||
        offer.affiliationId !== affiliationId
      ) {
        throw new ServiceOfferNotFoundError();
      }

      if (data.name !== undefined && data.name !== offer.name) {
        const clash = await this.offerRepo.findByNameInAffiliation(
          affiliationId,
          data.name,
          offer.id,
          tx,
        );
        if (clash) {
          throw new ServiceOfferNameAlreadyExistsError();
        }
      }

      if (data.specialtyId !== undefined && data.specialtyId !== offer.specialtyId) {
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
      }

      /// D5: sólo se bloquea si algún término contractual cambia efectivamente.
      const termsChanged = offer.termsDiffer({
        durationMin: data.durationMin,
        price,
        specialtyId: data.specialtyId,
      });

      if (termsChanged) {
        const appointmentCount = await this.appointmentPolicy.countByService(
          offer.id,
          tx,
        );
        if (appointmentCount > 0) {
          throw new ServiceImmutableTermsWithAppointmentsError();
        }
      }

      return this.offerRepo.update(
        offer.id,
        {
          name: data.name,
          description: data.description,
          durationMin: data.durationMin,
          price,
          specialtyId: data.specialtyId,
        },
        tx,
      );
    });

    return toServiceOfferResponseDTO(updated);
  }
}
