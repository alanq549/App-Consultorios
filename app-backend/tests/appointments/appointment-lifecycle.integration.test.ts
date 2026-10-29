/// ARCHIVO: tests/appointments/appointment-lifecycle.integration.test.ts
/// Pruebas de integración del orquestador global del ciclo de vida de citas.
///
/// Propósito: el cron es un job de sistema de alcance global que no debe asumir un tenant por
/// defecto. Estas pruebas siembran citas de profesionales afiliados a DOS tenants distintos y
/// verifican que el orquestador procesa por igual las citas de ambos:
/// - `PENDING` vencidas → `CANCELLED`.
/// - `CONFIRMED` terminadas → `COMPLETED`.
/// - Citas futuras → intactas.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import prisma from "@/shared/database/prisma";
import { processAppointmentLifecycle } from "@/modules/appointments/appointment-lifecycle";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Instante de referencia muy posterior a las citas sembradas: todas las de prueba quedan vencidas.
const NOW = new Date("2026-06-01T00:00:00.000Z");

describe("Ciclo de vida de citas — orquestador global multi-tenant", () => {
  let tenantA: number;
  let tenantB: number;
  let specialtyId: number;

  let profileA: number;
  let profileB: number;
  let clientProfileId: number;

  const userIds: number[] = [];
  const profileIds: number[] = [];
  const appointmentIds: number[] = [];

  // Instrumentación de la prueba de concurrencia. La limpieza vive en un hook (y no en un
  // `finally` del cuerpo) porque, si la barrera no se libera, el `Promise.all` nunca resuelve, el
  // runner agota el timeout y el `finally` NO llega a ejecutarse: el spy seguiría interceptando el
  // Prisma compartido y contaminaría las pruebas posteriores.
  //
  // Además de restaurar el spy y liberar la barrera, la limpieza **espera a que se asienten las
  // ejecuciones en vuelo**: al liberar la barrera, las llamadas pendientes continúan hacia su
  // `updateMany` y sus notificaciones. Si no se esperaran, ese trabajo seguiría corriendo durante
  // las pruebas posteriores o el teardown. Se usa `Promise.allSettled` (no `Promise.all`) porque
  // éste rechaza en cuanto UNA falla y la limpieza terminaría mientras la otra sigue procesando.
  let restoreFindMany: (() => void) | undefined;
  let releaseBarrier: (() => void) | undefined;
  let pendingRuns: Promise<unknown> | undefined;

  afterEach(async () => {
    const inFlight = pendingRuns;
    const restore = restoreFindMany;
    const release = releaseBarrier;
    pendingRuns = undefined;
    restoreFindMany = undefined;
    releaseBarrier = undefined;

    release?.();
    restore?.();
    await inFlight;
  });

  /// Siembra un usuario + perfil profesional afiliado ACTIVE al tenant indicado.
  async function createProfessional(
    label: string,
    tenantId: number,
  ): Promise<{ userId: number; profileId: number }> {
    const user = await prisma.user.create({
      data: {
        email: `lifecycle-${label}-${suffix}@test.invalid`,
        password: "test-password-hash",
        role: "PROFESSIONAL",
      },
      select: { id: true },
    });
    userIds.push(user.id);

    const profile = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        name: `Profesional ${label}`,
        description: "Biografía de prueba",
      },
      select: { id: true },
    });
    profileIds.push(profile.id);

    await prisma.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: profile.id,
        tenantId,
        status: "ACTIVE",
      },
    });

    return { userId: user.id, profileId: profile.id };
  }

  async function createService(profileId: number, name: string): Promise<number> {
    const service = await prisma.service.create({
      data: {
        name,
        description: "Servicio de prueba",
        durationMin: 30,
        price: 250,
        profileId,
        specialtyId,
      },
      select: { id: true },
    });

    return service.id;
  }

  /// Crea una cita de prueba y registra su id para la limpieza.
  async function createAppointment(data: {
    professionalProfileId: number;
    serviceId: number;
    date: string;
    startMin: number;
    endMin: number;
    status: "PENDING" | "CONFIRMED";
  }): Promise<number> {
    const appointment = await prisma.appointment.create({
      data: {
        clientProfileId,
        professionalProfileId: data.professionalProfileId,
        serviceId: data.serviceId,
        date: new Date(data.date),
        startMin: data.startMin,
        endMin: data.endMin,
        status: data.status,
      },
      select: { id: true },
    });
    appointmentIds.push(appointment.id);

    return appointment.id;
  }

  beforeAll(async () => {
    tenantA = (
      await prisma.tenant.create({
        data: { name: `Lifecycle A ${suffix}`, slug: `lifecycle-a-${suffix}` },
        select: { id: true },
      })
    ).id;
    tenantB = (
      await prisma.tenant.create({
        data: { name: `Lifecycle B ${suffix}`, slug: `lifecycle-b-${suffix}` },
        select: { id: true },
      })
    ).id;

    specialtyId = (
      await prisma.specialty.create({
        data: { name: `Especialidad lifecycle ${suffix}` },
        select: { id: true },
      })
    ).id;

    const professionalA = await createProfessional("a", tenantA);
    const professionalB = await createProfessional("b", tenantB);
    profileA = professionalA.profileId;
    profileB = professionalB.profileId;

    const clientUser = await prisma.user.create({
      data: {
        email: `lifecycle-cliente-${suffix}@test.invalid`,
        password: "test-password-hash",
        role: "CLIENT",
      },
      select: { id: true },
    });
    userIds.push(clientUser.id);

    clientProfileId = (
      await prisma.clientProfile.create({
        data: { userId: clientUser.id, name: "Cliente de prueba" },
        select: { id: true },
      })
    ).id;
  });

  afterAll(async () => {
    if (appointmentIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { appointmentId: { in: appointmentIds } },
      });
      await prisma.appointment.deleteMany({
        where: { id: { in: appointmentIds } },
      });
    }
    if (profileIds.length > 0) {
      await prisma.professionalTenantAffiliation.deleteMany({
        where: { professionalProfileId: { in: profileIds } },
      });
      await prisma.service.deleteMany({
        where: { profileId: { in: profileIds } },
      });
      await prisma.professionalProfile.deleteMany({
        where: { id: { in: profileIds } },
      });
    }
    await prisma.clientProfile.deleteMany({
      where: { userId: { in: userIds } },
    });
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.specialty.deleteMany({ where: { id: specialtyId } });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA, tenantB] } },
    });
  });

  it("procesa las citas de profesionales de distintos tenants sin asumir un tenant por defecto", async () => {
    const serviceA = await createService(profileA, `Servicio A ${suffix}`);
    const serviceB = await createService(profileB, `Servicio B ${suffix}`);

    // Tenant A: una pendiente vencida (→ cancelada) y una confirmada terminada (→ completada).
    const aPending = await createAppointment({
      professionalProfileId: profileA,
      serviceId: serviceA,
      date: "2020-01-01T00:00:00.000Z",
      startMin: 600,
      endMin: 660,
      status: "PENDING",
    });
    const aConfirmed = await createAppointment({
      professionalProfileId: profileA,
      serviceId: serviceA,
      date: "2020-01-02T00:00:00.000Z",
      startMin: 600,
      endMin: 660,
      status: "CONFIRMED",
    });

    // Tenant B: mismo par de casos, con otro profesional.
    const bPending = await createAppointment({
      professionalProfileId: profileB,
      serviceId: serviceB,
      date: "2020-01-03T00:00:00.000Z",
      startMin: 600,
      endMin: 660,
      status: "PENDING",
    });
    const bConfirmed = await createAppointment({
      professionalProfileId: profileB,
      serviceId: serviceB,
      date: "2020-01-04T00:00:00.000Z",
      startMin: 600,
      endMin: 660,
      status: "CONFIRMED",
    });

    // Una cita futura: no debe tocarse.
    const future = await createAppointment({
      professionalProfileId: profileA,
      serviceId: serviceA,
      date: "2030-06-01T00:00:00.000Z",
      startMin: 600,
      endMin: 660,
      status: "PENDING",
    });

    const changes = await processAppointmentLifecycle(NOW);

    // Se procesan las cuatro citas vencidas de ambos tenants.
    expect(changes).toBeGreaterThanOrEqual(4);

    const [aPendingRow, aConfirmedRow, bPendingRow, bConfirmedRow, futureRow] =
      await prisma.$transaction([
        prisma.appointment.findUnique({ where: { id: aPending } }),
        prisma.appointment.findUnique({ where: { id: aConfirmed } }),
        prisma.appointment.findUnique({ where: { id: bPending } }),
        prisma.appointment.findUnique({ where: { id: bConfirmed } }),
        prisma.appointment.findUnique({ where: { id: future } }),
      ]);

    expect(aPendingRow?.status).toBe("CANCELLED");
    expect(aConfirmedRow?.status).toBe("COMPLETED");
    expect(bPendingRow?.status).toBe("CANCELLED");
    expect(bConfirmedRow?.status).toBe("COMPLETED");
    expect(futureRow?.status).toBe("PENDING");
  });

  it("no vuelve a notificar al reprocesar una transición ya aplicada (idempotencia)", async () => {
    const serviceA = await createService(profileA, `Servicio idempotente ${suffix}`);

    const pending = await createAppointment({
      professionalProfileId: profileA,
      serviceId: serviceA,
      date: "2020-02-01T00:00:00.000Z",
      startMin: 600,
      endMin: 660,
      status: "PENDING",
    });

    // Primera ejecución: gana la transición y notifica (una por destinatario: cliente y profesional).
    const first = await processAppointmentLifecycle(NOW);
    expect(first).toBeGreaterThanOrEqual(1);

    const notificationsAfterFirst = await prisma.notification.count({
      where: { appointmentId: pending },
    });
    expect(notificationsAfterFirst).toBeGreaterThan(0);

    // Segunda ejecución (simula otra réplica o un reintento): la cita ya no está en estado
    // esperado, por lo que `updateMany` no afecta ninguna fila y no se notifica de nuevo.
    const second = await processAppointmentLifecycle(NOW);
    expect(second).toBe(0);

    const notificationsAfterSecond = await prisma.notification.count({
      where: { appointmentId: pending },
    });
    expect(notificationsAfterSecond).toBe(notificationsAfterFirst);

    const row = await prisma.appointment.findUnique({ where: { id: pending } });
    expect(row?.status).toBe("CANCELLED");
  });

  it("serializa dos ejecuciones concurrentes: la transición ocurre una sola vez y no duplica notificaciones", async () => {
    const serviceA = await createService(profileA, `Servicio concurrente ${suffix}`);

    const pending = await createAppointment({
      professionalProfileId: profileA,
      serviceId: serviceA,
      date: "2020-03-01T00:00:00.000Z",
      startMin: 600,
      endMin: 660,
      status: "PENDING",
    });

    // Barrera de sincronización: ninguna ejecución llega a su `updateMany` hasta que AMBAS han
    // leído la cita. Esto garantiza que las dos parten del mismo estado (`PENDING`) y compiten de
    // verdad; sin la barrera, la segunda lectura podría ocurrir tras el commit de la primera y la
    // prueba pasaría sin ejercitar la carrera.
    let reads = 0;
    const bothRead = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });

    const originalFindMany = prisma.appointment.findMany.bind(prisma.appointment);
    const findManySpy = vi.spyOn(prisma.appointment, "findMany");
    findManySpy.mockImplementation((async (...args: unknown[]) => {
      const result = await originalFindMany(...(args as []));
      reads += 1;
      if (reads >= 2) releaseBarrier?.();
      await bothRead;
      return result;
    }) as never);

    // El spy se restaura y las ejecuciones en vuelo se esperan en el `afterEach` del `describe`
    // (ver comentario arriba), de modo que un timeout no deje ni la instrumentación instalada sobre
    // el Prisma compartido ni trabajo asíncrono corriendo durante las pruebas posteriores.
    restoreFindMany = () => findManySpy.mockRestore();

    const runA = processAppointmentLifecycle(NOW);
    const runB = processAppointmentLifecycle(NOW);

    // `allSettled` para la limpieza: nunca rechaza y resuelve sólo cuando AMBAS terminan, así una
    // ejecución que falla antes que la otra no deja trabajo en vuelo para las pruebas siguientes.
    pendingRuns = Promise.allSettled([runA, runB]);

    // El cuerpo sí propaga errores: si alguna ejecución falla, la prueba falla.
    const [first, second] = await Promise.all([runA, runB]);

    // Ambas ejecuciones leyeron antes de competir.
    expect(reads).toBe(2);

    // La guarda de estado (`where id, status: PENDING`) hace que sólo una gane el `updateMany`.
    expect(first + second).toBe(1);

    const row = await prisma.appointment.findUnique({ where: { id: pending } });
    expect(row?.status).toBe("CANCELLED");

    // Una notificación por destinatario (cliente y profesional) del único ganador: sin duplicados.
    const notifications = await prisma.notification.count({
      where: { appointmentId: pending },
    });
    expect(notifications).toBe(2);
  });
});
