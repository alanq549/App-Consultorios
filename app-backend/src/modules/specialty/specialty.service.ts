import prisma from "@/core/prisma";
import { CreateSpecialtyDTO, UpdateSpecialtyDTO } from "./specialty.dto";

export class SpecialtyService {
  static async create(data: CreateSpecialtyDTO) {
    const exists = await prisma.specialty.findUnique({
      where: { name: data.name },
    });

    if (exists) {
      throw new Error("La especialidad ya existe");
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

  static async listByProfessional(profileId: number) {
    const relations = await prisma.professionalSpecialty.findMany({
      where: {
        professionalId: profileId,
        status: "APPROVED",
        specialty: {
          isActive: true,
        },
      },
      include: {
        specialty: true,
      },
    });

    return relations.map((r) => r.specialty);
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

  static async remove(id: number) {
    return prisma.specialty.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
