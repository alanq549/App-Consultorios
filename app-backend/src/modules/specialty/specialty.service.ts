///src/modules/specialty/specialty.service.ts
import prisma from "@/shared/database/prisma";
import { CreateSpecialtyDTO, UpdateSpecialtyDTO } from "./specialty.dto";
import { PrismaActiveAffiliationChecker } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-active-affiliation-checker";

/// Alcance multi-tenant del catálogo: la relación profesional–especialidad no guarda `tenantId`,
/// así que la pertenencia se deriva de la afiliación activa del perfil en el tenant solicitado.
const activeAffiliationChecker = new PrismaActiveAffiliationChecker();

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

  /// Lista las especialidades de un profesional dentro del tenant seleccionado.
  ///
  /// El catálogo global de `Specialty` no es tenant-owned, pero esta vista es la proyección
  /// pública de un profesional, así que se rige por el mismo alcance que su catálogo de
  /// servicios: sólo se expone en tenants donde mantiene una afiliación activa.
  ///
  /// @returns La lista de especialidades del profesional, o `null` si no pertenece al tenant.
  static async listByProfessional(profileId: number, tenantId: number) {
    const isAffiliated = await activeAffiliationChecker.hasActiveAffiliation(
      profileId,
      tenantId,
    );

    if (!isAffiliated) {
      return null;
    }

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
