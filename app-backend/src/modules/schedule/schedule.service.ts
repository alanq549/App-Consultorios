// src/modules/schedule/schedule.service.ts
import prisma from "@/core/prisma";
import { CreateScheduleDTO, UpdateScheduleDTO } from "./schedule.dto";

const SLOT_MINUTES = 15;

export class ScheduleService {

  private static validateTimeRules(startMin: number, endMin: number) {
    if (startMin >= endMin) {
      throw new Error("El horario de inicio debe ser menor que el de fin");
    }

    if (startMin < 0 || endMin > 1440) {
      throw new Error("Horario fuera de rango válido");
    }

    if (startMin % SLOT_MINUTES !== 0 || endMin % SLOT_MINUTES !== 0) {
      throw new Error("Los horarios deben ser múltiplos de 15 minutos");
    }
  }

  private static async validateOverlap(
    profileId: number,
    dayOfWeek: number,
    startMin: number,
    endMin: number,
    excludeId?: number
  ) {
    const overlap = await prisma.schedule.findFirst({
      where: {
        profileId,
        dayOfWeek,
        isActive: true,
        NOT: excludeId ? { id: excludeId } : undefined,
        AND: [
          { startMin: { lt: endMin } },
          { endMin: { gt: startMin } },
        ],
      },
    });

    if (overlap) {
      throw new Error("El horario se solapa con otro existente");
    }
  }

  static async create(profileId: number, data: CreateScheduleDTO) {
    this.validateTimeRules(data.startMin, data.endMin);

    await this.validateOverlap(
      profileId,
      data.dayOfWeek,
      data.startMin,
      data.endMin
    );

    return prisma.schedule.create({
      data: {
        ...data,
        profileId,
      },
    });
  }

  static async update(
    id: number,
    profileId: number,
    data: UpdateScheduleDTO
  ) {
    const schedule = await prisma.schedule.findFirst({
      where: { id, profileId },
    });

    if (!schedule) {
      throw new Error("No autorizado o no existe");
    }

    const newStart = data.startMin ?? schedule.startMin;
    const newEnd = data.endMin ?? schedule.endMin;

    this.validateTimeRules(newStart, newEnd);

    await this.validateOverlap(
      profileId,
      schedule.dayOfWeek,
      newStart,
      newEnd,
      id
    );

    return prisma.schedule.update({
      where: { id },
      data,
    });
  }

  static async remove(id: number, profileId: number) {
    const schedule = await prisma.schedule.findFirst({
      where: { id, profileId },
    });

    if (!schedule) {
      throw new Error("No autorizado o no existe");
    }

    // 🔥 No eliminar si hay citas futuras dentro de ese rango
    const futureAppointments = await prisma.appointment.count({
      where: {
        professionalProfileId: profileId,
        date: { gte: new Date() },
        startMin: { gte: schedule.startMin },
        endMin: { lte: schedule.endMin },
        status: { not: "CANCELLED" },
      },
    });

    if (futureAppointments > 0) {
      throw new Error(
        "No puedes eliminar un horario con citas futuras programadas"
      );
    }

    return prisma.schedule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  static async findByProfessional(profileId: number) {
    return prisma.schedule.findMany({
      where: { profileId, isActive: true },
      orderBy: { dayOfWeek: "asc" },
    });
  }
}
