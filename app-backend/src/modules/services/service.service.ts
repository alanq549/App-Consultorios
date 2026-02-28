// src/modules/service/service.service.ts
import prisma from "@/core/prisma";
import { CreateServiceDTO, UpdateServiceDTO } from "./service.dto";

export class ServiceService {

  // Validaciones de negocio comunes para create/update
  private static validateBusinessRules(data: {
    durationMin?: number;
    price?: number;
  }) {
    if (data.durationMin !== undefined) {
      if (data.durationMin <= 0) {
        throw new Error("La duración debe ser mayor a 0");
      }

      if (data.durationMin % 15 !== 0) {
        throw new Error("La duración debe ser múltiplo de 15 minutos");
      }
    }

    if (data.price !== undefined) {
      if (Number(data.price) <= 0) {
        throw new Error("El precio debe ser mayor a 0");
      }
    }
  }

  // crear servicio para un professional logeado
  static async create(profileId: number, data: CreateServiceDTO) {
    this.validateBusinessRules(data);

    // Validar nombre único por profesional
    const existing = await prisma.service.findFirst({
      where: {
        profileId,
        name: data.name,
        isActive: true,
      },
    });

    if (existing) {
      throw new Error("Ya existe un servicio con ese nombre");
    }

    return prisma.service.create({
      data: {
        ...data,
        profileId,
      },
      include: { specialty: true },
    });
  }

  // listar servicios activos de un profesional
  static async findByProfessional(profileId: number) {
    return prisma.service.findMany({
      where: { profileId, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { specialty: true },
    });
  }

  // actualizar servicio (solo por su dueño)
  static async update(
    id: number,
    profileId: number,
    data: UpdateServiceDTO
  ) {
    this.validateBusinessRules(data);

    // Validar ownership
    const service = await prisma.service.findFirst({
      where: { id, profileId },
    });

    if (!service) {
      throw new Error("No autorizado o no existe");
    }

    // Validar nombre único si se cambia
    if (data.name && data.name !== service.name) {
      const duplicate = await prisma.service.findFirst({
        where: {
          profileId,
          name: data.name,
          isActive: true,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new Error("Ya existe un servicio con ese nombre");
      }
    }

    return prisma.service.update({
      where: { id },
      data,
      include: { specialty: true },
    });
  }

    // desactivar servicio (solo por su dueño)
  static async remove(id: number, profileId: number) {
    const service = await prisma.service.findFirst({
      where: { id, profileId },
    });

    if (!service) {
      throw new Error("No autorizado o no existe");
    }

    // 🔥 Regla importante
    const futureAppointments = await prisma.appointment.count({
      where: {
        serviceId: id,
        date: { gte: new Date() },
        status: { not: "CANCELLED" },
      },
    });

    if (futureAppointments > 0) {
      throw new Error(
        "No puedes desactivar un servicio con citas futuras agendadas"
      );
    }

    return prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}