/// ARCHIVO: tests/catalog/service-offer-concurrency.integration.test.ts
/// Prueba de integración contra PostgreSQL que demuestra la serialización D5 entre el ciclo de
/// vida de la oferta (Catalog) y la creación de citas (Appointments) mediante el lock de fila
/// compartido `SELECT id FROM "Service" ... FOR UPDATE`.
///
/// Cubre las dos carreras reportadas en el hallazgo P1 de la Misión 4:
/// 1. Reserva concurrente vs. actualización de términos (price/durationMin).
/// 2. Reserva concurrente vs. desactivación (soft-delete) de la oferta.
///
/// A diferencia de la prueba unitaria (lock simulado), aquí se ejercita el row-level lock real del
/// motor y se verifica con `pg_blocking_pids` que la operación competidora espera el mismo lock.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/shared/database/prisma";
import { AppointmentService } from "@/modules/appointments/appointments.service";
import { PrismaServiceOfferRepository } from "@/modules/catalog/infrastructure/prisma/prisma-service-offer-repository";
import { PrismaOfferAppointmentPolicy } from "@/modules/catalog/infrastructure/prisma/prisma-offer-appointment-policy";
import { PrismaSpecialtyRepository } from "@/modules/catalog/infrastructure/prisma/prisma-specialty-repository";
import { PrismaProfessionalSpecialtyRepository } from "@/modules/catalog/infrastructure/prisma/prisma-professional-specialty-repository";
import { PrismaProfessionalTenantContext } from "@/modules/profiles/infrastructure/prisma/prisma-professional-tenant-context";
import { PrismaTransactionRunner } from "@/shared/database/prisma-transaction-context";
import { UpdateServiceOfferUseCase } from "@/modules/catalog/application/use-cases/update-service-offer.use-case";
import { DeactivateServiceOfferUseCase } from "@/modules/catalog/application/use-cases/deactivate-service-offer.use-case";
import {
  ServiceImmutableTermsWithAppointmentsError,
  ServiceHasPendingAppointmentsError,
} from "@/modules/catalog/domain/catalog-errors";

const SUITE_TIMEOUT_MS = 30_000;
const LOCK_DETECTION_TIMEOUT_MS = 3_000;
/// Duración base de la oferta y delta esperado de la reserva (múltiplo de 15).
const BASE_DURATION_MIN = 30;
const CHANGED_DURATION_MIN = 60;
const START_MIN = 600;

interface Scenario {
  userId: number;
  professionalProfileId: number;
  tenantId: number;
  affiliationId: number;
  serviceId: number;
  clientProfileId: number;
  date: string;
}

describe("Integración Catalog–Appointments: serialización D5 de la oferta bajo concurrencia (PostgreSQL)", () => {
  const offerRepo = new PrismaServiceOfferRepository();
  const appointmentPolicy = new PrismaOfferAppointmentPolicy();
  const writeContext = new PrismaProfessionalTenantContext();
  const transactionRunner = new PrismaTransactionRunner();

  const updateUseCase = new UpdateServiceOfferUseCase(
    offerRepo,
    new PrismaSpecialtyRepository(),
    new PrismaProfessionalSpecialtyRepository(),
    writeContext,
    appointmentPolicy,
    transactionRunner,
  );

  const deactivateUseCase = new DeactivateServiceOfferUseCase(
    offerRepo,
    writeContext,
    appointmentPolicy,
    transactionRunner,
  );

  const userIds: number[] = [];
  const tenantIds: number[] = [];
  const affiliationIds: number[] = [];
  const serviceIds: number[] = [];
  const specialtyIds: number[] = [];

  beforeAll(async () => {
    // Calienta la conexión a Neon: la primera invocación puede fallar si el endpoint está
    // suspendido, lo que provocaría un falso negativo en la siembra.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }, SUITE_TIMEOUT_MS);

  afterAll(async () => {
    // Orden respetando las FK Restrict: citas -> ofertas -> afiliaciones -> usuarios -> tenants.
    // Las notificaciones (`Notification.appointmentId`) se eliminan por CASCADE con la cita.
    if (serviceIds.length > 0) {
      await prisma.appointment
        .deleteMany({ where: { serviceId: { in: serviceIds } } })
        .catch(() => {});
      await prisma.service
        .deleteMany({ where: { id: { in: serviceIds } } })
        .catch(() => {});
    }
    if (affiliationIds.length > 0) {
      await prisma.professionalTenantAffiliation
        .deleteMany({ where: { id: { in: affiliationIds } } })
        .catch(() => {});
    }
    if (userIds.length > 0) {
      await prisma.user
        .deleteMany({ where: { id: { in: userIds } } })
        .catch(() => {});
    }
    if (tenantIds.length > 0) {
      await prisma.tenant
        .deleteMany({ where: { id: { in: tenantIds } } })
        .catch(() => {});
    }
    if (specialtyIds.length > 0) {
      await prisma.specialty
        .deleteMany({ where: { id: { in: specialtyIds } } })
        .catch(() => {});
    }
  }, SUITE_TIMEOUT_MS);

  /// Siembra un profesional aprobado, afiliado ACTIVE a un tenant ACTIVE, con una oferta activa,
  /// agenda de cobertura total y un cliente. Devuelve los identificadores necesarios para disparar
  /// tanto la reserva (Appointments) como las mutaciones de la oferta (Catalog).
  async function seedScenario(): Promise<Scenario> {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const specialty = await prisma.specialty.create({
      data: { name: `Conc ${unique}`, isActive: true },
      select: { id: true },
    });
    specialtyIds.push(specialty.id);

    const proUser = await prisma.user.create({
      data: {
        email: `conc-pro-${unique}@test.invalid`,
        password: "test-password-hash",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    userIds.push(proUser.id);

    const profile = await prisma.professionalProfile.create({
      data: {
        userId: proUser.id,
        name: `Dr. Concurrencia ${unique}`,
        description: "Perfil para prueba de serialización D5",
        verificationStatus: "APPROVED",
      },
      select: { id: true },
    });

    const tenant = await prisma.tenant.create({
      data: { name: `Tenant ${unique}`, slug: `tenant-${unique}`, status: "ACTIVE" },
      select: { id: true },
    });
    tenantIds.push(tenant.id);

    await prisma.tenantMembership.create({
      data: { userId: proUser.id, tenantId: tenant.id, role: "OWNER", status: "ACTIVE" },
    });

    const affiliation = await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: profile.id,
        tenantId: tenant.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    affiliationIds.push(affiliation.id);

    // Agenda de cobertura total (todos los días, 00:00–24:00) para no depender del día de la semana.
    await prisma.schedule.createMany({
      data: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
        profileId: profile.id,
        dayOfWeek,
        startMin: 0,
        endMin: 1440,
        isActive: true,
      })),
    });

    const service = await prisma.service.create({
      data: {
        name: `Servicio ${unique}`,
        description: "Oferta para prueba de concurrencia",
        durationMin: BASE_DURATION_MIN,
        price: "100.00",
        profileId: profile.id,
        affiliationId: affiliation.id,
        specialtyId: specialty.id,
      },
      select: { id: true },
    });
    serviceIds.push(service.id);

    const clientUser = await prisma.user.create({
      data: {
        email: `conc-cli-${unique}@test.invalid`,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });
    userIds.push(clientUser.id);

    const clientProfile = await prisma.clientProfile.create({
      data: { userId: clientUser.id, name: `Cliente ${unique}` },
      select: { id: true },
    });

    const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return {
      userId: proUser.id,
      professionalProfileId: profile.id,
      tenantId: tenant.id,
      affiliationId: affiliation.id,
      serviceId: service.id,
      clientProfileId: clientProfile.id,
      date,
    };
  }

  /// Transacción retenedora que adquiere el lock de fila de la oferta y lo mantiene hasta que se
  /// invoca `release`. Devuelve el pid del backend que retiene el lock.
  function startLockHolder(serviceId: number): {
    holderPromise: Promise<unknown>;
    lockAcquired: Promise<void>;
    release: () => void;
    getPid: () => number;
  } {
    let signalLockAcquired: () => void = () => {};
    const lockAcquired = new Promise<void>((resolve) => {
      signalLockAcquired = resolve;
    });

    let signalRelease: () => void = () => {};
    let released = false;
    const canRelease = new Promise<void>((resolve) => {
      signalRelease = () => {
        if (!released) {
          released = true;
          resolve();
        }
      };
    });

    let holderPid = 0;

    const holderPromise = prisma.$transaction(
      async (tx) => {
        const [{ pid }] =
          await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
        holderPid = pid;

        const rows = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "Service" WHERE id = ${serviceId} FOR UPDATE
        `;
        expect(rows.length).toBe(1);

        signalLockAcquired();
        await canRelease;
      },
      { timeout: 25_000, maxWait: 10_000 },
    );

    return {
      holderPromise,
      lockAcquired,
      release: signalRelease,
      getPid: () => holderPid,
    };
  }

  /// Ejecuta una reserva de cita (Appointments) para el escenario dado.
  function bookAppointment(scenario: Scenario): Promise<unknown> {
    return AppointmentService.create(
      scenario.clientProfileId,
      {
        professionalProfileId: scenario.professionalProfileId,
        serviceId: scenario.serviceId,
        date: scenario.date,
        startMin: START_MIN,
        notes: "reserva concurrente",
      },
      scenario.tenantId,
    );
  }

  /// Sondea `pg_blocking_pids` hasta observar al menos una sesión bloqueada por el holder que
  /// espera el lock de la oferta (`FOR UPDATE` sobre "Service").
  async function waitForBlockedServiceLock(holderPid: number): Promise<boolean> {
    const deadline = Date.now() + LOCK_DETECTION_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const waiting = await prisma.$queryRaw<Array<{ pid: number }>>`
        SELECT pid
        FROM pg_stat_activity
        WHERE ${holderPid} = ANY(pg_blocking_pids(pid))
          AND query ILIKE '%"Service"%'
          AND query ILIKE '%FOR UPDATE%'
      `;
      if (waiting.length > 0) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return false;
  }

  /// Espera a que el holder confirme la adquisición del lock, con un tope de tiempo.
  async function awaitLockAcquired(holder: { lockAcquired: Promise<void> }) {
    await Promise.race([
      holder.lockAcquired,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout esperando el lock de la oferta")),
          5_000,
        ),
      ),
    ]);
  }

  it(
    "serializa la reserva con la actualización de términos: la duración de la cita nunca queda desalineada (D5)",
    async () => {
      const scenario = await seedScenario();
      const holder = startLockHolder(scenario.serviceId);

      try {
        await awaitLockAcquired(holder);

        // Reserva (Appointments) y cambio de términos (Catalog) compiten por el mismo lock.
        const createPromise = bookAppointment(scenario);
        const updatePromise = updateUseCase.execute({
          userId: scenario.userId,
          tenantId: scenario.tenantId,
          offerId: scenario.serviceId,
          data: { durationMin: CHANGED_DURATION_MIN },
        });
        // Evita rechazos no manejados mientras se confirma el bloqueo; el resultado se consume luego.
        createPromise.catch(() => {});
        updatePromise.catch(() => {});

        expect(await waitForBlockedServiceLock(holder.getPid())).toBe(true);

        holder.release();

        const [createResult, updateResult] = await Promise.allSettled([
          createPromise,
          updatePromise,
        ]);

        // La reserva siempre prospera; la actualización puede rechazarse si la cita ganó la carrera.
        expect(createResult.status).toBe("fulfilled");
        if (updateResult.status === "rejected") {
          expect(updateResult.reason).toBeInstanceOf(
            ServiceImmutableTermsWithAppointmentsError,
          );
        }

        // Invariante D5: la duración final de la oferta coincide con el delta reservado en la cita.
        // Si la reserva hubiera leído la duración antes del cambio (carrera sin lock), esta
        // igualdad se rompería (oferta en 60, cita con delta 30).
        const appointment = await prisma.appointment.findFirst({
          where: { serviceId: scenario.serviceId },
          select: { startMin: true, endMin: true },
        });
        const freshService = await prisma.service.findUnique({
          where: { id: scenario.serviceId },
          select: { durationMin: true },
        });

        expect(appointment).not.toBeNull();
        expect(freshService?.durationMin).toBe(
          appointment!.endMin - appointment!.startMin,
        );
      } finally {
        holder.release();
        await holder.holderPromise.catch(() => {});
      }
    },
    SUITE_TIMEOUT_MS,
  );

  it(
    "serializa la reserva con la desactivación: exactamente una de las dos operaciones triunfa (D5)",
    async () => {
      const scenario = await seedScenario();
      const holder = startLockHolder(scenario.serviceId);

      try {
        await awaitLockAcquired(holder);

        const createPromise = bookAppointment(scenario);
        const deactivatePromise = deactivateUseCase.execute({
          userId: scenario.userId,
          tenantId: scenario.tenantId,
          offerId: scenario.serviceId,
        });
        createPromise.catch(() => {});
        deactivatePromise.catch(() => {});

        expect(await waitForBlockedServiceLock(holder.getPid())).toBe(true);

        holder.release();

        const results = await Promise.allSettled([createPromise, deactivatePromise]);
        const [createResult, deactivateResult] = results;

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        const freshService = await prisma.service.findUnique({
          where: { id: scenario.serviceId },
          select: { isActive: true },
        });
        const appointmentCount = await prisma.appointment.count({
          where: { serviceId: scenario.serviceId },
        });

        if (createResult.status === "fulfilled") {
          // La cita ganó: la desactivación debe rechazarse por citas bloqueantes.
          expect(deactivateResult.status).toBe("rejected");
          expect((deactivateResult as PromiseRejectedResult).reason).toBeInstanceOf(
            ServiceHasPendingAppointmentsError,
          );
          expect(freshService?.isActive).toBe(true);
          expect(appointmentCount).toBe(1);
        } else {
          // La desactivación ganó: la reserva no debe poder asociarse a una oferta inactiva.
          expect(deactivateResult.status).toBe("fulfilled");
          expect(freshService?.isActive).toBe(false);
          expect(appointmentCount).toBe(0);
        }
      } finally {
        holder.release();
        await holder.holderPromise.catch(() => {});
      }
    },
    SUITE_TIMEOUT_MS,
  );
});
