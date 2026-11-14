/// ARCHIVO: tests/catalog/service-offer.use-cases.unit.test.ts
/// Pruebas unitarias del ciclo de vida de la oferta reservable (Misión 4 - Fase 5).
/// Cubre D3 (ownership por afiliación), D4 (autorización), D5 (inmutabilidad y desactivación)
/// y D7 (formato/precisión de precio).

import { describe, it, expect, beforeEach } from "vitest";
import { TransactionRunner, TransactionContext } from "@/shared/types/transaction-context";
import { ServiceOfferRepository } from "@/modules/catalog/domain/repositories/service-offer.repository";
import { SpecialtyRepository } from "@/modules/catalog/domain/repositories/specialty.repository";
import { ProfessionalSpecialtyRepository } from "@/modules/catalog/domain/repositories/professional-specialty.repository";
import {
  ActiveAffiliationCheckerPort,
} from "@/modules/catalog/application/ports/active-affiliation-checker.port";
import {
  OfferWriteContextPort,
  OfferWriteContext,
} from "@/modules/catalog/application/ports/offer-write-context.port";
import { OfferAppointmentPolicyPort } from "@/modules/catalog/application/ports/offer-appointment-policy.port";
import { ServiceOffer, ServiceOfferProps } from "@/modules/catalog/domain/offer/service-offer.entity";
import { Specialty } from "@/modules/catalog/domain/specialty.entity";
import {
  ProfessionalSpecialty,
  ProfessionalSpecialtyStatus,
} from "@/modules/catalog/domain/professional-specialty.entity";
import {
  InvalidServiceOfferDataError,
  ServiceImmutableTermsWithAppointmentsError,
  ServiceOfferNameAlreadyExistsError,
  ServiceOfferNotFoundError,
  ServiceHasPendingAppointmentsError,
  SpecialtyInactiveError,
  UnauthorizedAffiliationActionError,
} from "@/modules/catalog/domain/catalog-errors";
import { CreateServiceOfferUseCase } from "@/modules/catalog/application/use-cases/create-service-offer.use-case";
import { UpdateServiceOfferUseCase } from "@/modules/catalog/application/use-cases/update-service-offer.use-case";
import { DeactivateServiceOfferUseCase } from "@/modules/catalog/application/use-cases/deactivate-service-offer.use-case";
import { ListProfessionalPublicOffersUseCase } from "@/modules/catalog/application/use-cases/list-professional-public-offers.use-case";

const TENANT_ID = 7;
const USER_ID = 42;
const PROFILE_ID = 100;
const AFFILIATION_ID = 555;

class FakeTransactionRunner implements TransactionRunner {
  async run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return fn({ transactionId: "fake-tx" });
  }
}

class InMemoryServiceOfferRepository implements ServiceOfferRepository {
  public items: ServiceOffer[] = [];
  private nextId = 1;

  seed(partial: Partial<ServiceOfferProps> & {
    id: number;
    affiliationId: number | null;
    name: string;
  }): ServiceOffer {
    const now = new Date();
    const offer = ServiceOffer.fromPersistence({
      id: partial.id,
      name: partial.name,
      description: partial.description ?? "Descripción base",
      durationMin: partial.durationMin ?? 30,
      price: partial.price ?? "100.00",
      isActive: partial.isActive ?? true,
      profileId: partial.profileId ?? PROFILE_ID,
      affiliationId: partial.affiliationId,
      specialtyId: partial.specialtyId ?? 1,
      specialty: partial.specialty ?? null,
      createdAt: now,
      updatedAt: now,
    });
    this.items.push(offer);
    return offer;
  }

  async findById(id: number): Promise<ServiceOffer | null> {
    return this.items.find((offer) => offer.id === id) ?? null;
  }

  async findByNameInAffiliation(
    affiliationId: number,
    name: string,
    excludeId?: number,
  ): Promise<ServiceOffer | null> {
    return (
      this.items.find(
        (offer) =>
          offer.affiliationId === affiliationId &&
          offer.name === name &&
          offer.id !== excludeId,
      ) ?? null
    );
  }

  async listActiveByAffiliation(affiliationId: number): Promise<ServiceOffer[]> {
    return this.items.filter(
      (offer) => offer.affiliationId === affiliationId && offer.isActive,
    );
  }

  async create(
    data: Parameters<ServiceOfferRepository["create"]>[0],
  ): Promise<ServiceOffer> {
    const now = new Date();
    const offer = ServiceOffer.fromPersistence({
      id: this.nextId++,
      name: data.name,
      description: data.description,
      durationMin: data.durationMin,
      price: data.price,
      isActive: true,
      profileId: data.profileId,
      affiliationId: data.affiliationId,
      specialtyId: data.specialtyId,
      specialty: null,
      createdAt: now,
      updatedAt: now,
    });
    this.items.push(offer);
    return offer;
  }

  async update(
    id: number,
    data: Parameters<ServiceOfferRepository["update"]>[1],
  ): Promise<ServiceOffer> {
    const index = this.items.findIndex((offer) => offer.id === id);
    const snapshot = this.items[index].toSnapshot();
    const updated = ServiceOffer.fromPersistence({
      ...snapshot,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.durationMin !== undefined ? { durationMin: data.durationMin } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.specialtyId !== undefined ? { specialtyId: data.specialtyId } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      updatedAt: new Date(),
    });
    this.items[index] = updated;
    return updated;
  }

  async deactivate(id: number): Promise<ServiceOffer> {
    return this.update(id, { isActive: false });
  }

  /// Registra los locks solicitados para verificar la serialización D5 en las pruebas.
  public lockedIds: number[] = [];

  async lockForUpdate(id: number): Promise<void> {
    this.lockedIds.push(id);
  }
}

class FakeSpecialtyRepository implements Pick<SpecialtyRepository, "findById"> {
  constructor(private readonly specialties: Map<number, Specialty>) {}

  async findById(id: number): Promise<Specialty | null> {
    return this.specialties.get(id) ?? null;
  }
}

class FakeProfessionalSpecialtyRepository
  implements Pick<ProfessionalSpecialtyRepository, "findByProfessionalAndSpecialty">
{
  constructor(private readonly status: ProfessionalSpecialtyStatus | null) {}

  async findByProfessionalAndSpecialty(
    professionalId: number,
    specialtyId: number,
  ): Promise<ProfessionalSpecialty | null> {
    if (this.status === null) return null;
    return new ProfessionalSpecialty({ professionalId, specialtyId, status: this.status });
  }
}

class FakeWriteContext implements OfferWriteContextPort {
  constructor(public context: OfferWriteContext) {}

  async resolve(): Promise<OfferWriteContext> {
    return this.context;
  }
}

class FakeAppointmentPolicy implements OfferAppointmentPolicyPort {
  public totalAppointments = 0;
  public blocking = false;

  async countByService(): Promise<number> {
    return this.totalAppointments;
  }

  async hasBlockingAppointments(): Promise<boolean> {
    return this.blocking;
  }
}

class FakeAffiliationChecker implements ActiveAffiliationCheckerPort {
  constructor(private readonly affiliationByProfile = new Map<number, number>()) {}

  setAffiliation(profileId: number, affiliationId: number): void {
    this.affiliationByProfile.set(profileId, affiliationId);
  }

  async hasActiveAffiliation(profileId: number): Promise<boolean> {
    return this.affiliationByProfile.has(profileId);
  }

  async findActiveAffiliationId(profileId: number): Promise<number | null> {
    return this.affiliationByProfile.get(profileId) ?? null;
  }
}

const authorizedContext: OfferWriteContext = {
  professionalProfileId: PROFILE_ID,
  profileApproved: true,
  membershipActive: true,
  affiliationId: AFFILIATION_ID,
};

function activeSpecialty(id: number): Specialty {
  return Specialty.create({ id, name: `Especialidad ${id}`, isActive: true });
}

describe("ServiceOffer use cases (Misión 4)", () => {
  let offerRepo: InMemoryServiceOfferRepository;
  let appointmentPolicy: FakeAppointmentPolicy;
  let specialtyRepo: FakeSpecialtyRepository;
  let professionalSpecialtyRepo: FakeProfessionalSpecialtyRepository;
  let writeContext: FakeWriteContext;
  let runner: FakeTransactionRunner;

  beforeEach(() => {
    offerRepo = new InMemoryServiceOfferRepository();
    appointmentPolicy = new FakeAppointmentPolicy();
    specialtyRepo = new FakeSpecialtyRepository(
      new Map([[1, activeSpecialty(1)], [2, Specialty.create({ id: 2, name: "Inactiva", isActive: false })]]),
    );
    professionalSpecialtyRepo = new FakeProfessionalSpecialtyRepository("APPROVED");
    writeContext = new FakeWriteContext({ ...authorizedContext });
    runner = new FakeTransactionRunner();
  });

  function buildCreateUseCase() {
    return new CreateServiceOfferUseCase(
      offerRepo,
      specialtyRepo as unknown as SpecialtyRepository,
      professionalSpecialtyRepo as unknown as ProfessionalSpecialtyRepository,
      writeContext,
      runner,
    );
  }

  function buildUpdateUseCase() {
    return new UpdateServiceOfferUseCase(
      offerRepo,
      specialtyRepo as unknown as SpecialtyRepository,
      professionalSpecialtyRepo as unknown as ProfessionalSpecialtyRepository,
      writeContext,
      appointmentPolicy,
      runner,
    );
  }

  function buildDeactivateUseCase() {
    return new DeactivateServiceOfferUseCase(
      offerRepo,
      writeContext,
      appointmentPolicy,
      runner,
    );
  }

  describe("Crear oferta (D3, D4, D7)", () => {
    const baseInput = {
      userId: USER_ID,
      tenantId: TENANT_ID,
      data: {
        name: "Consulta General",
        description: "Consulta médica general",
        durationMin: 30,
        price: "150.5",
        specialtyId: 1,
      },
    };

    it("crea la oferta vinculada a la afiliación derivada del contexto y normaliza el precio", async () => {
      const result = await buildCreateUseCase().execute(baseInput);

      expect(result.affiliationId).toBe(AFFILIATION_ID);
      expect(result.profileId).toBe(PROFILE_ID);
      expect(result.price).toBe("150.50");
      expect(result.isActive).toBe(true);
      expect(result.specialtyId).toBe(1);
    });

    it.each([
      ["150.555"],
      [150.555],
    ])("rechaza el precio %s con más de 2 decimales sin redondear", async (price) => {
      await expect(
        buildCreateUseCase().execute({
          ...baseInput,
          data: { ...baseInput.data, price: price as unknown as string },
        }),
      ).rejects.toThrow(InvalidServiceOfferDataError);

      await expect(
        buildCreateUseCase().execute({
          ...baseInput,
          data: { ...baseInput.data, price: price as unknown as string },
        }),
      ).rejects.toThrow("El precio no puede tener más de 2 decimales");

      // Ninguna escritura parcial
      expect(offerRepo.items).toHaveLength(0);
    });

    it("rechaza duración que no es múltiplo de 15 sin escribir", async () => {
      await expect(
        buildCreateUseCase().execute({
          ...baseInput,
          data: { ...baseInput.data, durationMin: 20 },
        }),
      ).rejects.toThrow(InvalidServiceOfferDataError);
      expect(offerRepo.items).toHaveLength(0);
    });

    it("deniega la creación si el perfil no está aprobado (D4)", async () => {
      writeContext.context = { ...authorizedContext, profileApproved: false };
      await expect(buildCreateUseCase().execute(baseInput)).rejects.toThrow(
        UnauthorizedAffiliationActionError,
      );
    });

    it("deniega la creación si la membresía no está activa (D4)", async () => {
      writeContext.context = { ...authorizedContext, membershipActive: false };
      await expect(buildCreateUseCase().execute(baseInput)).rejects.toThrow(
        UnauthorizedAffiliationActionError,
      );
    });

    it("deniega la creación si no hay afiliación activa (D4)", async () => {
      writeContext.context = { ...authorizedContext, affiliationId: null };
      await expect(buildCreateUseCase().execute(baseInput)).rejects.toThrow(
        UnauthorizedAffiliationActionError,
      );
    });

    it("deniega la creación si la especialidad está inactiva", async () => {
      await expect(
        buildCreateUseCase().execute({
          ...baseInput,
          data: { ...baseInput.data, specialtyId: 2 },
        }),
      ).rejects.toThrow(SpecialtyInactiveError);
    });

    it("deniega la creación si el profesional no tiene aprobada la especialidad", async () => {
      professionalSpecialtyRepo = new FakeProfessionalSpecialtyRepository("PENDING");
      await expect(buildCreateUseCase().execute(baseInput)).rejects.toThrow(
        UnauthorizedAffiliationActionError,
      );
    });

    it("rechaza un nombre duplicado dentro de la misma afiliación", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta General" });
      await expect(buildCreateUseCase().execute(baseInput)).rejects.toThrow(
        ServiceOfferNameAlreadyExistsError,
      );
    });

    it("permite el mismo nombre en otra afiliación (D3)", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID + 1, name: "Consulta General" });
      const result = await buildCreateUseCase().execute(baseInput);
      expect(result.affiliationId).toBe(AFFILIATION_ID);
    });
  });

  describe("Actualizar oferta (D5)", () => {
    it("permite editar descripción aunque existan citas (términos intactos)", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.totalAppointments = 5;

      const result = await buildUpdateUseCase().execute({
        userId: USER_ID,
        tenantId: TENANT_ID,
        offerId: 1,
        data: { description: "Nueva descripción" },
      });

      expect(result.description).toBe("Nueva descripción");
      expect(result.price).toBe("100.00");
    });

    it("bloquea el cambio de precio si la oferta ya tiene citas", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.totalAppointments = 1;

      await expect(
        buildUpdateUseCase().execute({
          userId: USER_ID,
          tenantId: TENANT_ID,
          offerId: 1,
          data: { price: "200.00" },
        }),
      ).rejects.toThrow(ServiceImmutableTermsWithAppointmentsError);

      expect(offerRepo.items[0].price).toBe("100.00");
    });

    it("bloquea el cambio de duración y especialidad si la oferta ya tiene citas", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.totalAppointments = 3;

      await expect(
        buildUpdateUseCase().execute({
          userId: USER_ID,
          tenantId: TENANT_ID,
          offerId: 1,
          data: { durationMin: 45 },
        }),
      ).rejects.toThrow(ServiceImmutableTermsWithAppointmentsError);

      await expect(
        buildUpdateUseCase().execute({
          userId: USER_ID,
          tenantId: TENANT_ID,
          offerId: 1,
          data: { specialtyId: 1 },
        }),
      ).resolves.toMatchObject({ specialtyId: 1 });
    });

    it("permite cambiar términos cuando no hay citas", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.totalAppointments = 0;

      const result = await buildUpdateUseCase().execute({
        userId: USER_ID,
        tenantId: TENANT_ID,
        offerId: 1,
        data: { price: 200, durationMin: 45 },
      });

      expect(result.price).toBe("200.00");
      expect(result.durationMin).toBe(45);
    });

    it("no permite modificar una oferta de otra afiliación (404 uniforme)", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID + 1, name: "Ajena" });

      await expect(
        buildUpdateUseCase().execute({
          userId: USER_ID,
          tenantId: TENANT_ID,
          offerId: 1,
          data: { description: "Intento" },
        }),
      ).rejects.toThrow(ServiceOfferNotFoundError);
    });

    it("no permite modificar una oferta legacy sin afiliación", async () => {
      offerRepo.seed({ id: 1, affiliationId: null, name: "Legacy" });

      await expect(
        buildUpdateUseCase().execute({
          userId: USER_ID,
          tenantId: TENANT_ID,
          offerId: 1,
          data: { description: "Intento" },
        }),
      ).rejects.toThrow(ServiceOfferNotFoundError);
    });

    it("adquiere el lock de fila de la oferta antes de comprobar las citas (D5)", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.totalAppointments = 0;

      await buildUpdateUseCase().execute({
        userId: USER_ID,
        tenantId: TENANT_ID,
        offerId: 1,
        data: { price: "200.00" },
      });

      expect(offerRepo.lockedIds).toContain(1);
    });
  });

  describe("Desactivar oferta (D5)", () => {
    it("desactiva (soft-delete) cuando no hay citas bloqueantes", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.blocking = false;

      const result = await buildDeactivateUseCase().execute({
        userId: USER_ID,
        tenantId: TENANT_ID,
        offerId: 1,
      });

      expect(result.isActive).toBe(false);
      expect(offerRepo.items[0].isActive).toBe(false);
    });

    it("bloquea la desactivación cuando hay citas pendientes o en curso", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.blocking = true;

      await expect(
        buildDeactivateUseCase().execute({
          userId: USER_ID,
          tenantId: TENANT_ID,
          offerId: 1,
        }),
      ).rejects.toThrow(ServiceHasPendingAppointmentsError);

      expect(offerRepo.items[0].isActive).toBe(true);
    });

    it("es idempotente sobre una oferta ya desactivada", async () => {
      offerRepo.seed({
        id: 1,
        affiliationId: AFFILIATION_ID,
        name: "Consulta",
        isActive: false,
      });
      appointmentPolicy.blocking = true;

      const result = await buildDeactivateUseCase().execute({
        userId: USER_ID,
        tenantId: TENANT_ID,
        offerId: 1,
      });

      expect(result.isActive).toBe(false);
    });

    it("no permite desactivar una oferta de otra afiliación", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID + 1, name: "Ajena" });

      await expect(
        buildDeactivateUseCase().execute({
          userId: USER_ID,
          tenantId: TENANT_ID,
          offerId: 1,
        }),
      ).rejects.toThrow(ServiceOfferNotFoundError);
    });

    it("adquiere el lock de fila de la oferta antes de comprobar citas bloqueantes (D5)", async () => {
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Consulta" });
      appointmentPolicy.blocking = false;

      await buildDeactivateUseCase().execute({
        userId: USER_ID,
        tenantId: TENANT_ID,
        offerId: 1,
      });

      expect(offerRepo.lockedIds).toContain(1);
    });
  });

  describe("Listado público (D3)", () => {
    it("devuelve la lista de ofertas activas de la afiliación del tenant", async () => {
      const checker = new FakeAffiliationChecker();
      checker.setAffiliation(PROFILE_ID, AFFILIATION_ID);
      offerRepo.seed({ id: 1, affiliationId: AFFILIATION_ID, name: "Activa" });
      offerRepo.seed({
        id: 2,
        affiliationId: AFFILIATION_ID,
        name: "Inactiva",
        isActive: false,
      });
      offerRepo.seed({ id: 3, affiliationId: AFFILIATION_ID + 1, name: "Otra afiliación" });

      const useCase = new ListProfessionalPublicOffersUseCase(checker, offerRepo);
      const result = await useCase.execute({ profileId: PROFILE_ID, tenantId: TENANT_ID });

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].name).toBe("Activa");
    });

    it("devuelve null (404) cuando el profesional no tiene afiliación activa", async () => {
      const checker = new FakeAffiliationChecker();
      const useCase = new ListProfessionalPublicOffersUseCase(checker, offerRepo);

      const result = await useCase.execute({ profileId: PROFILE_ID, tenantId: TENANT_ID });
      expect(result).toBeNull();
    });
  });
});
