// appointments.service.ts
import prisma from "@/core/prisma";
import {
  AppointmentResponseDTO,
  CreateAppointmentDTO,
  CreateGuestAppointmentDTO,
} from "./appointments.dto";
import { generateAvailabilitySlots } from "./availability.util";
/* import { appointmentQueue } from "./appointment.worker"; */
import { NotificationService } from "../notifications/notifications.service";

export class AppointmentService {
  // Crear cita con clientProfile
  static async create(
    clientProfileId: number,
    data: CreateAppointmentDTO,
  ): Promise<AppointmentResponseDTO> {
    const service = await this.getServiceById(
      data.serviceId,
      data.professionalProfileId,
    );

    const endMin = data.startMin + service.durationMin;
    const appointmentDate = new Date(data.date + "T00:00:00");
    const now = new Date();

    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setMinutes(data.startMin);

    if (appointmentDateTime <= now) {
      throw new Error("No puedes crear citas en el pasado");
    }

    await this.validateSchedule(
      data.professionalProfileId,
      appointmentDate,
      data.startMin,
      endMin,
    );

    await this.validateOverlap(
      data.professionalProfileId,
      appointmentDate,
      data.startMin,
      endMin,
    );

    const appointment = await prisma.appointment.create({
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
      },
    });

    if (!appointment.clientProfile) {
      throw new Error(
        "No se pudo crear la notificación: clientProfile faltante",
      );
    }

    await NotificationService.notifyAppointmentCreated(
      appointment.clientProfile.userId,
      appointment.professional.userId,
      appointment.id,
    );

    return this.mapToDTO(appointment);
  }

  // Crear cita para guest
  static async createGuest(
    professionalProfileId: number,
    data: CreateGuestAppointmentDTO,
  ): Promise<AppointmentResponseDTO> {
    const service = await this.getServiceById(
      data.serviceId,
      professionalProfileId,
    );

    const endMin = data.startMin + service.durationMin;
    const appointmentDate = new Date(data.date + "T00:00:00Z");
    const now = new Date();

    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setMinutes(data.startMin);

    if (appointmentDateTime <= now) {
      throw new Error("No puedes crear citas en el pasado");
    }

    await this.validateSchedule(
      professionalProfileId,
      appointmentDate,
      data.startMin,
      endMin,
    );

    await this.validateOverlap(
      professionalProfileId,
      appointmentDate,
      data.startMin,
      endMin,
    );

    // Buscar o crear guest
    let guest = await prisma.guestClient.findFirst({
      where: { email: data.guestEmail || undefined, name: data.guestName },
    });

    if (!guest) {
      guest = await prisma.guestClient.create({
        data: {
          name: data.guestName,
          email: data.guestEmail,
          phone: data.guestPhone,
        },
      });
    }

    const appointment = await prisma.appointment.create({
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
        guest: true,
      },
    });

    return this.mapToDTO(appointment, true);
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
      const base = new Date(appointment.date);
      const fullDate = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        Math.floor(appointment.startMin / 60),
        appointment.startMin % 60,
      );

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

    if (updated.clientProfile) {
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

    // Filtrar solo citas que todavía no pasaron
    const upcoming = appointments.filter((appt) => {
      const base = new Date(appt.date);
      const fullDate = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        Math.floor(appt.startMin / 60),
        appt.startMin % 60,
      );
      return fullDate >= now;
    });

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
      where,
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
  ) {
    const now = new Date();

    if (endOfDay <= now) return [];

    const service = await this.getServiceById(serviceId, professionalProfileId);
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
      serviceDuration: service.durationMin,
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

  private static async getServiceById(serviceId: number, profileId: number) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, profileId, isActive: true },
    });
    if (!service) throw new Error("Servicio no pertenece al profesional");
    return service;
  }

  private static async validateSchedule(
    professionalProfileId: number,
    date: Date,
    startMin: number,
    endMin: number,
  ) {
    const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    const schedule = await prisma.schedule.findFirst({
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
  ) {
    const overlap = await prisma.appointment.findFirst({
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
  ): AppointmentResponseDTO {
    const specialty =
      appointment.professional.specialties?.[0]?.specialty || null;

    return {
      id: appointment.id,
      date: appointment.date.toISOString(),
      startMin: appointment.startMin,
      endMin: appointment.endMin,
      notes: appointment.notes,
      status: appointment.status,
      service: {
        id: appointment.service.id,
        name: appointment.service.name,
        description: appointment.service.description,
        durationMin: appointment.service.durationMin,
        price: Number(appointment.service.price),
      },
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
