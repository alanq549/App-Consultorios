///src/modules/specialty/specialty.service.ts
import prisma from "@/core/prisma";
import { CreateSpecialtyDTO, UpdateSpecialtyDTO } from "./specialty.dto";

export class SpecialtyService {
  static async create(data: CreateSpecialtyDTO) {
    const exists = await prisma.specialty.findUnique({
      where: { name: data.name },
    });

    if (exists && exists.isActive) {
      throw new Error("La especialidad ya existe");
    }

    if (exists && !exists.isActive) {
      return prisma.specialty.update({
        where: { id: exists.id },
        data: { ...data, isActive: true },
      });
    }

    return prisma.specialty.create({
      data,
    });
  }

  static async list() {
    return prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  static async list_soft_delete() {
    return prisma.specialty.findMany({
      where: { isActive: false },
      orderBy: { name: "asc" },
    });
  }

  static async listByProfessional(profileId: number) {
    return prisma.professionalSpecialty.findMany({
      where: {
        professionalId: profileId,
        specialty: {
          isActive: true,
        },
      },
      include: {
        specialty: true,
      },
    });
  }

  static async update(id: number, data: UpdateSpecialtyDTO) {
    const specialty = await prisma.specialty.findUnique({
      where: { id },
    });

    if (!specialty) {
      throw new Error("Especialidad no encontrada");
    }

    return prisma.specialty.update({
      where: { id },
      data,
    });
  }

  static async restore(id: number) {
    return prisma.specialty.update({
      where: { id },
      data: { isActive: true },
    });
  }

  static async remove(id: number) {
    return prisma.specialty.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
