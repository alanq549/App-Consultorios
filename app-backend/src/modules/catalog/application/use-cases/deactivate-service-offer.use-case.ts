/// ARCHIVO: src/modules/catalog/application/use-cases/deactivate-service-offer.use-case.ts
/// Caso de uso: desactivar (soft-delete) una oferta reservable (D4, D5).
///
/// D5: la desactivación se rechaza si existe al menos una cita no terminal
/// (`PENDING`/`CONFIRMED`) cuyo instante de finalización `endDateTime > now`.

import { TransactionRunner } from "@/shared/types/transaction-context";
import { ServiceOfferRepository } from "../../domain/repositories/service-offer.repository";
import { OfferWriteContextPort } from "../ports/offer-write-context.port";
import { OfferAppointmentPolicyPort } from "../ports/offer-appointment-policy.port";
import {
  UnauthorizedAffiliationActionError,
  ServiceOfferNotFoundError,
  ServiceHasPendingAppointmentsError,
} from "../../domain/catalog-errors";
import {
  ServiceOfferResponseDTO,
  toServiceOfferResponseDTO,
} from "../dto/service-offer.dto";

export interface DeactivateServiceOfferInput {
  userId: number;
  tenantId: number;
  offerId: number;
}

export class DeactivateServiceOfferUseCase {
  constructor(
    private readonly offerRepo: ServiceOfferRepository,
    private readonly writeContext: OfferWriteContextPort,
    private readonly appointmentPolicy: OfferAppointmentPolicyPort,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(
    input: DeactivateServiceOfferInput,
  ): Promise<ServiceOfferResponseDTO> {
    const { userId, tenantId, offerId } = input;

    const deactivated = await this.transactionRunner.run(async (tx) => {
      const ctx = await this.writeContext.resolve({ userId, tenantId, tx });

      if (
        ctx.professionalProfileId === null ||
        !ctx.profileApproved ||
        !ctx.membershipActive ||
        ctx.affiliationId === null
      ) {
        throw new UnauthorizedAffiliationActionError();
      }

      const affiliationId = ctx.affiliationId;

      /// Serialización D5: se toma el lock de fila de la oferta ANTES de leerla y de comprobar
      /// citas bloqueantes. Appointments adquiere el mismo lock antes de crear una cita, de modo
      /// que no puede colarse una reserva entre la comprobación y la desactivación.
      await this.offerRepo.lockForUpdate(offerId, tx);

      const offer = await this.offerRepo.findById(offerId, tx);
      if (
        !offer ||
        offer.affiliationId === null ||
        offer.affiliationId !== affiliationId
      ) {
        throw new ServiceOfferNotFoundError();
      }

      /// Idempotente: una oferta ya desactivada se devuelve sin re-evaluar la política de citas.
      if (!offer.isActive) {
        return offer;
      }

      const blocking = await this.appointmentPolicy.hasBlockingAppointments(
        offer.id,
        new Date(),
        tx,
      );
      if (blocking) {
        throw new ServiceHasPendingAppointmentsError();
      }

      return this.offerRepo.deactivate(offer.id, tx);
    });

    return toServiceOfferResponseDTO(deactivated);
  }
}
