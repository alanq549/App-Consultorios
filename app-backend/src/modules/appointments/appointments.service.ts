// appointments.service.ts
import prisma from "@/shared/database/prisma";
import {
  PrismaTransactionRunner,
  extractPrismaClientFromContext,
} from "@/shared/database/prisma-transaction-context";
import { lockServiceRowForUpdate } from "@/shared/database/service-row-lock";
import {
  AppointmentResponseDTO,
  CreateAppointmentDTO,
  CreateGuestAppointmentDTO,
} from "./appointments.dto";
import { generateAvailabilitySlots } from "./availability.util";
/* import { appointmentQueue } from "./appointment.worker"; */
import { NotificationService } from "../notifications/notifications.service";
import type { BookableService, CatalogReader } from "@/modules/catalog";
import {
  buildUTCDate,
  parseCalendarDateUTC,
} from "@/shared/time/appointment-datetime";

/// Cliente transaccional para las reservas. La creación de una cita se ejecuta dentro de una
/// transacción y toma el lock de fila de la oferta (`Service`) antes de leerla y de insertar,
/// compartiendo el punto de serialización con el ciclo de vida de la oferta en Catalog (D5).
const transactionRunner = new PrismaTransactionRunner();

/// Cliente Prisma global o transaccional, según el contexto de ejecución.
type Db = ReturnType<typeof extractPrismaClientFromContext>;

/// Dependencias inyectadas desde el Composition Root (src/app.wiring.ts).
/// Appointments no importa el repositorio Prisma del catálogo: consume el contrato `CatalogReader`.
export interface AppointmentServiceDependencies {
  catalogReader: CatalogReader;
}

export class AppointmentService {
  private static dependencies?: AppointmentServiceDependencies;

  /// Inyecta el contrato de lectura reservable de Catalog sin acoplar Appointments a su
  /// infraestructura de persistencia.
  static injectDependencies(deps: AppointmentServiceDependencies): void {
    AppointmentService.dependencies = deps;
  }

  private static getCatalogReader(): CatalogReader {
    const reader = AppointmentService.dependencies?.catalogReader;
    if (!reader) {
      throw new Error(
        "[AppointmentService] CatalogReader no ha sido inyectado. " +
          "Asegúrese de conectar las dependencias desde el composition root (src/app.wiring.ts).",
      );
    }
    return reader;
  }

  // Crear cita con clientProfile
  static async create(
    clientProfileId: number,
    data: CreateAppointmentDTO,
    tenantId: number,
  ): Promise<AppointmentResponseDTO | null> {
    const catalogReader = AppointmentService.getCatalogReader();

    /// D5: la reserva se ejecuta dentro de una transacción y toma el lock de fila de la oferta
    /// ANTES de leerla y de insertar la cita. Así queda serializada con la comprobación y mutación
    /// de términos en Catalog: una reserva concurrente no puede usar una duración leída antes de
    /// un cambio de términos, ni asociarse a una oferta que se está desactivando.
    ///
    /// La lectura reservable se delega a `CatalogReader`: devuelve `null` —y la reserva responde
    /// 404 uniforme— cuando el profesional no está afiliado ACTIVE al tenant, la oferta es de otro
    /// profesional, está inactiva o su especialidad fue desactivada (D3/D6).
    const result = await transactionRunner.run(async (tx) => {
      const db = extractPrismaClientFromContext(tx) as Db;

      await lockServiceRowForUpdate(data.serviceId, tx);

      const service = await catalogReader.getBookableService(
        data.serviceId,
        data.professionalProfileId,
        tenantId,
        tx,
      );

      if (!service) {
        return null;
      }

      const endMin = data.startMin + service.durationMin;
      // PRE-D5: la fecha calendario se persiste siempre como medianoche UTC, independiente de la
      // zona horaria del servidor, y el instante se combina en UTC.
      const appointmentDate = parseCalendarDateUTC(data.date);
      const now = new Date();

      const appointmentDateTime = buildUTCDate(appointmentDate, data.startMin);

      if (appointmentDateTime <= now) {
        throw new Error("No puedes crear citas en el pasado");
      }

      await this.validateSchedule(
        data.professionalProfileId,
        appointmentDate,
        data.startMin,
        endMin,
        db,
      );

      await this.validateOverlap(
        data.professionalProfileId,
        appointmentDate,
        data.startMin,
        endMin,
        db,
      );

      /// Misión 5: la oferta ya se resolvió vía `CatalogReader`, por lo que este flujo NO carga la
      /// relación Prisma `appointment.service`; la respuesta se arma con el snapshot del contrato
      /// (D7), evitando acoplar Appointments a la tabla de catálogo.
      const created = await db.appointment.create({
        data: {
          clientProfileId,
          professionalProfileId: data.professionalProfileId,
          serviceId: data.serviceId,
          date: appointmentDate,
          startMin: data.startMin,
          endMin,
          notes: data.notes,
        },
        include: {
          professional: {
            include: {
              user: true,
              specialties: {
                where: { status: "APPROVED" },
                include: { specialty: true },
              },
            },
          },
          clientProfile: { include: { user: true } },
        },
      });

      return { appointment: created, service };
    });

    // El profesional no ofrece una oferta reservable en el tenant seleccionado: respuesta
    // uniforme de no encontrado (no se revela la existencia del perfil ni de la oferta).
    if (!result) {
      return null;
    }

    const { appointment, service } = result;

    /// Best-effort observable: la notificación se ejecuta FUERA de la transacción de persistencia
    /// (tras el commit) y su fallo NUNCA debe propagarse. La cita ya quedó creada; si devolviéramos
    /// error al cliente, un reintento podría generar una reserva duplicada.
    try {
      if (!appointment.clientProfile) {
        throw new Error("clientProfile faltante para notificar la cita");
      }

      await NotificationService.notifyAppointmentCreated(
        appointment.clientProfile.userId,
        appointment.professional.userId,
        appointment.id,
      );
    } catch (err) {
      console.error(
        `[Appointments] Falló la notificación de creación de la cita ${appointment.id}:`,
        err,
      );
    }

    return this.mapToDTO(appointment, false, service);
  }

  // Crear cita para guest
  static async createGuest(
    professionalProfileId: number,
    data: CreateGuestAppointmentDTO,
    tenantId: number,
  ): Promise<AppointmentResponseDTO | null> {
    const catalogReader = AppointmentService.getCatalogReader();

    /// D5: mismo punto de serialización que el flujo regular — lock de fila de la oferta dentro
    /// de una transacción antes de leer la oferta e insertar la cita.
    ///
    /// La reservabilidad se resuelve con `CatalogReader` (tenant-aware): `null` si el profesional
    /// no está afiliado ACTIVE al tenant, la oferta es de otro profesional o no es reservable.
    const result = await transactionRunner.run(async (tx) => {
      const db = extractPrismaClientFromContext(tx) as Db;

      await lockServiceRowForUpdate(data.serviceId, tx);

      const service = await catalogReader.getBookableService(
        data.serviceId,
        professionalProfileId,
        tenantId,
        tx,
      );

      if (!service) {
        return null;
      }

      const endMin = data.startMin + service.durationMin;
      // PRE-D5: mismo estándar que el flujo regular — fecha calendario en medianoche UTC.
      const appointmentDate = parseCalendarDateUTC(data.date);
      const now = new Date();

      const appointmentDateTime = buildUTCDate(appointmentDate, data.startMin);

      if (appointmentDateTime <= now) {
        throw new Error("No puedes crear citas en el pasado");
      }

      await this.validateSchedule(
        professionalProfileId,
        appointmentDate,
        data.startMin,
        endMin,
        db,
      );

      await this.validateOverlap(
        professionalProfileId,
        appointmentDate,
        data.startMin,
        endMin,
        db,
      );

      // Buscar o crear guest
      let guest = await db.guestClient.findFirst({
        where: { email: data.guestEmail || undefined, name: data.guestName },
      });

      if (!guest) {
        guest = await db.guestClient.create({
          data: {
            name: data.guestName,
            email: data.guestEmail,
            phone: data.guestPhone,
          },
        });
      }

      /// Misión 5: la oferta procede de `CatalogReader`, no de la relación Prisma; la respuesta se
      /// arma con el snapshot del contrato (D7).
      const created = await db.appointment.create({
        data: {
          guestId: guest.id,
          professionalProfileId,
          serviceId: data.serviceId,
          date: appointmentDate,
          startMin: data.startMin,
          endMin,
          notes: data.notes,
        },
        include: {
          professional: {
            include: {
              user: true,
              specialties: {
                where: { status: "APPROVED" },
                include: { specialty: true },
              },
            },
          },
          guest: true,
        },
      });

      return { appointment: created, service };
    });

    // Oferta no reservable en el tenant seleccionado: 404 uniforme (sin revelar existencia).
    if (!result) {
      return null;
    }

    const { appointment, service } = result;

    return this.mapToDTO(appointment, true, service);
  }

  // Actualizar estado por profesional
  static async updateStatusByProfessional(
    professionalUserId: number,
    appointmentId: number,
    status: "CONFIRMED" | "CANCELLED",
  ): Promise<AppointmentResponseDTO> {
    const professionalProfile = await prisma.professionalProfile.findUnique({
      where: { userId: professionalUserId },
    });

    if (!professionalProfile) throw new Error("Profesional no encontrado");

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        professional: {
          include: {
            user: true,
            specialties: {
              where: { status: "APPROVED" },
              include: { specialty: true },
            },
          },
        },
        clientProfile: { include: { user: true } },
        guest: true,
      },
    });

    if (!appointment) throw new Error("Cita no encontrada");

    if (appointment.professionalProfileId !== professionalProfile.id) {
      throw new Error("No autorizado");
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["CANCELLED"],
    };

    if (!validTransitions[appointment.status]?.includes(status)) {
      throw new Error(`No se puede pasar de ${appointment.status} a ${status}`);
    }

    if (status === "CONFIRMED") {
      // PRE-D5: el instante se reconstruye en UTC, igual que en la creación de la cita.
      const fullDate = buildUTCDate(appointment.date, appointment.startMin);

      if (fullDate < new Date())
        throw new Error("No se puede confirmar una cita pasada");
    }

    const result = await prisma.appointment.updateMany({
      where: { id: appointmentId, status: appointment.status },
      data: { status },
    });

    if (result.count === 0) {
      throw new Error("La cita fue modificada por otro proceso");
    }

    const updated = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        professional: {
          include: {
            user: true,
            specialties: {
              where: { status: "APPROVED" },
              include: { specialty: true },
            },
          },
        },
        clientProfile: { include: { user: true } },
        guest: true,
      },
    });

    if (!updated) throw new Error("Error inesperado");

    /// Best-effort observable: las notificaciones de cambio de estado ocurren DESPUÉS de persistir
    /// el `update` y su fallo NUNCA debe propagarse. El cambio de estado ya quedó confirmado; si
    /// devolviéramos error al cliente, un reintento operaría sobre un estado ya aplicado.
    if (updated.clientProfile) {
      try {
        if (status === "CONFIRMED") {
          await NotificationService.notifyAppointmentConfirmed(
            updated.clientProfile.userId,
            updated.professional.userId,
            updated.id,
          );
        } else if (status === "CANCELLED") {
          await NotificationService.notifyAppointmentCancelled(
            updated.clientProfile.userId,
            updated.professional.userId,
            updated.id,
            "PROFESSIONAL",
          );
        }
      } catch (err) {
        console.error(
          `[Appointments] Falló la notificación de cambio de estado (${status}) de la cita ${updated.id}:`,
          err,
        );
      }
    }

    if (updated.guest && status === "CANCELLED") {
      console.log("Enviar email a guest:", updated.guest.email);
    }

    return this.mapToDTO(updated, !!updated.guest);
  }

  // Obtener próximas citas de un usuario (cliente o profesional)
  static async getUpcomingAppointmentsByUser(
    userId: number,
  ): Promise<AppointmentResponseDTO[]> {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    const professionalProfile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    const where: any = {};

    if (clientProfile) {
      where.OR = [{ clientProfileId: clientProfile.id }];
    }

    if (professionalProfile) {
      where.OR = where.OR
        ? [...where.OR, { professionalProfileId: professionalProfile.id }]
        : [{ professionalProfileId: professionalProfile.id }];
    }

    if (!where.OR) return [];

    const appointments = await prisma.appointment.findMany({
      where: {
        ...where,
        status: { not: "CANCELLED" },
      },
      include: {
        service: true,
        professional: {
          include: {
            user: true,
            specialties: {
              where: { status: "APPROVED" },
              include: { specialty: true },
            },
          },
        },
        clientProfile: { include: { user: true } },
        guest: true,
      },
      orderBy: { date: "asc" },
    });

    const now = new Date();

    // Filtrar solo citas que todavía no pasaron (instante reconstruido en UTC — PRE-D5)
    const upcoming = appointments.filter(
      (appt) => buildUTCDate(appt.date, appt.startMin) >= now,
    );

    // Mapear usando el helper central para mantener consistencia
    return upcoming.map((appt) => this.mapToDTO(appt, !!appt.guest));
  }

  // Obtener todas las citas de un usuario (cliente o profesional)
  static async getAppointmentsByUser(
    userId: number,
  ): Promise<AppointmentResponseDTO[]> {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });
    const professionalProfile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    const where: any = {};

    if (clientProfile) {
      where.OR = [{ clientProfileId: clientProfile.id }];
    }
    if (professionalProfile) {
      where.OR = where.OR
        ? [...where.OR, { professionalProfileId: professionalProfile.id }]
        : [{ professionalProfileId: professionalProfile.id }];
    }

    if (!where.OR) return []; // usuario sin citas

    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [{ clientProfile: { userId } }, { professional: { userId } }],
      },
      include: {
        service: true,
        professional: {
          include: {
            user: true,
            specialties: {
              where: { status: "APPROVED" },
              include: { specialty: true },
            },
          },
        },
        clientProfile: { include: { user: true } },
        guest: true,
        review: true,
      },
      orderBy: { date: "desc" },
    });

    // Mapear usando el helper central
    return appointments.map((appt) => this.mapToDTO(appt, !!appt.guest));
  }

  // Slots disponibles
  static async getAvailability(
    professionalProfileId: number,
    serviceId: number,
    startOfDay: Date,
    endOfDay: Date,
    tenantId: number,
  ) {
    const catalogReader = AppointmentService.getCatalogReader();

    // La disponibilidad solo se expone para una oferta reservable en el tenant seleccionado.
    // `null` → 404 uniforme (profesional no afiliado, oferta inactiva/de otro profesional, etc.).
    const service = await catalogReader.getBookableService(
      serviceId,
      professionalProfileId,
      tenantId,
    );

    if (!service) {
      return null;
    }

    const now = new Date();

    if (endOfDay <= now) return [];

    const durationMin = service.durationMin;
    const jsDay = startOfDay.getUTCDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const schedules = await prisma.schedule.findMany({
      where: { profileId: professionalProfileId, dayOfWeek, isActive: true },
      select: { startMin: true, endMin: true },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        professionalProfileId,
        date: { gte: startOfDay, lt: endOfDay },
        status: { not: "CANCELLED" },
      },
      select: { startMin: true, endMin: true },
    });

    const slots = generateAvailabilitySlots({
      schedules,
      appointments,
      serviceDuration: durationMin,
    });

    const isToday = startOfDay <= now && endOfDay > now;

    if (isToday) {
      const minutesSinceStart = Math.floor(
        (now.getTime() - startOfDay.getTime()) / 60000,
      );
      return slots.filter((slot) => slot.startMin > minutesSinceStart);
    }

    return slots;
  }

  // -----------------------------
  // 🔒 Helpers privados
  // -----------------------------

  private static async validateSchedule(
    professionalProfileId: number,
    date: Date,
    startMin: number,
    endMin: number,
    db: Db = prisma,
  ) {
    const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    const schedule = await db.schedule.findFirst({
      where: {
        profileId: professionalProfileId,
        dayOfWeek,
        startMin: { lte: startMin },
        endMin: { gte: endMin },
        isActive: true,
      },
    });
    if (!schedule) throw new Error("Fuera de horario");
  }

  private static async validateOverlap(
    professionalProfileId: number,
    date: Date,
    startMin: number,
    endMin: number,
    db: Db = prisma,
  ) {
    const overlap = await db.appointment.findFirst({
      where: {
        professionalProfileId,
        date,
        status: { not: "CANCELLED" },
        AND: [{ startMin: { lt: endMin } }, { endMin: { gt: startMin } }],
      },
    });
    if (overlap) throw new Error("Horario ocupado");
  }

  // Mapper común a DTO
  private static mapToDTO(
    appointment: any,
    isGuest = false,
    /// Misión 5: snapshot de la oferta resuelta por `CatalogReader`. Los flujos de reserva lo
    /// proporcionan para no depender de la relación Prisma `appointment.service`; los flujos de
    /// lectura histórica lo omiten y derivan el bloque del `service` incluido.
    serviceSnapshot?: BookableService,
  ): AppointmentResponseDTO {
    const specialty =
      appointment.professional.specialties?.[0]?.specialty || null;

    /// D7: el precio se expone como string decimal de exactamente dos posiciones. Desde el
    /// contrato es ya el valor exacto; desde el `Decimal(10,2)` se formatea sin aritmética de
    /// punto flotante.
    const service = serviceSnapshot
      ? {
          id: serviceSnapshot.id,
          name: serviceSnapshot.name,
          description: serviceSnapshot.description,
          durationMin: serviceSnapshot.durationMin,
          price: serviceSnapshot.price,
        }
      : {
          id: appointment.service.id,
          name: appointment.service.name,
          description: appointment.service.description,
          durationMin: appointment.service.durationMin,
          price: appointment.service.price.toFixed(2),
        };

    return {
      id: appointment.id,
      date: appointment.date.toISOString(),
      startMin: appointment.startMin,
      endMin: appointment.endMin,
      notes: appointment.notes,
      status: appointment.status,
      service,
      professional: {
        id: appointment.professional.id,
        name: appointment.professional.name,
        lastName: appointment.professional.lastName,
        phone: appointment.professional.phone,
        avatar: appointment.professional.avatar,
        specialty: specialty
          ? { id: specialty.id, name: specialty.name }
          : null,
        user: {
          id: appointment.professional.user.id,
          email: appointment.professional.user.email,
        },
      },
      client:
        !isGuest && appointment.clientProfile
          ? {
              id: appointment.clientProfile.id,
              name: appointment.clientProfile.name,
              lastName: appointment.clientProfile.lastName,
              avatar: appointment.clientProfile.avatar,
              user: {
                id: appointment.clientProfile.user.id,
                email: appointment.clientProfile.user.email,
              },
            }
          : appointment.guest
            ? {
                id: appointment.guest.id,
                name: appointment.guest.name,
                lastName: null,
                user: { id: 0, email: appointment.guest.email || "" },
              }
            : null,
    };
  }
}
