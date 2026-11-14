// src/modules/service/service.service.ts
import prisma from "@/shared/database/prisma";
import { CreateServiceDTO, UpdateServiceDTO } from "./service.dto";
import type { ActiveAffiliationChecker } from "@/modules/profiles";
import type { CatalogTaxonomyContract } from "@/modules/catalog";

export interface ServiceServiceDependencies {
  catalogTaxonomy: CatalogTaxonomyContract;
  affiliationChecker: ActiveAffiliationChecker;
}

export class ServiceService {
  private static dependencies?: ServiceServiceDependencies;

  /**
   * Inyecta dependencias desde el Composition Root de aplicación (src/app.wiring.ts).
   * Mantiene al módulo Services desacoplado del wiring global y de implementaciones concretas.
   */
  static injectDependencies(deps: ServiceServiceDependencies): void {
    ServiceService.dependencies = deps;
  }

  private static getCatalogTaxonomy(): CatalogTaxonomyContract {
    if (!ServiceService.dependencies?.catalogTaxonomy) {
      throw new Error(
        "[ServiceService] CatalogTaxonomyContract no ha sido inyectado. " +
          "Asegúrese de conectar las dependencias desde el composition root.",
      );
    }
    return ServiceService.dependencies.catalogTaxonomy;
  }

  private static getAffiliationChecker(): ActiveAffiliationChecker {
    if (!ServiceService.dependencies?.affiliationChecker) {
      throw new Error(
        "[ServiceService] ActiveAffiliationChecker no ha sido inyectado. " +
          "Asegúrese de conectar las dependencias desde el composition root.",
      );
    }
    return ServiceService.dependencies.affiliationChecker;
  }

  /// funcion para validar la especialidad del profesional
  private static async ensureProfessionalHasSpecialty(
    profileId: number,
    specialtyId: number,
  ) {
    await ServiceService.getCatalogTaxonomy().ensureActiveSpecialtyExists(specialtyId);

    const hasSpecialty = await prisma.professionalSpecialty.findFirst({
      where: {
        professionalId: profileId,
        specialtyId,
        status: "APPROVED",
      },
    });

    if (!hasSpecialty) {
      throw new Error("El profesional no tiene esta especialidad");
    }
  }

  private static async ensureUniqueServiceName(
    profileId: number,
    name: string,
    excludeId?: number,
  ) {
    const existing = await prisma.service.findFirst({
      where: {
        profileId,
        name,
        isActive: true,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new Error("Ya existe un servicio con ese nombre");
    }
  }

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

  static async getProfileIdByUser(userId: number): Promise<number> {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new Error("Perfil profesional no existe");
    }

    return profile.id;
  }

  /// Lista los servicios activos de un profesional dentro del tenant seleccionado.
  ///
  /// El catálogo no almacena `tenantId`: el alcance se deriva de la afiliación activa del
  /// profesional. Un profesional sólo expone su catálogo en los tenants donde está afiliado y
  /// activo, de modo que una ruta pública con el tenant equivocado no devuelve datos suyos.
  ///
  /// @returns La lista de servicios, o `null` si el profesional no pertenece al tenant, para que
  ///          la ruta responda 404 uniforme sin revelar si el perfil existe.
  static async findByProfessional(profileId: number, tenantId: number) {
    const isAffiliated = await ServiceService.getAffiliationChecker().hasActiveAffiliation(
      profileId,
      tenantId,
    );

    if (!isAffiliated) {
      return null;
    }

    return prisma.service.findMany({
      where: { profileId, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { specialty: true },
    });
  }

  // crear servicio para un professional logeado
  static async create(profileId: number, data: CreateServiceDTO) {
    this.validateBusinessRules(data);

    await this.ensureUniqueServiceName(profileId, data.name);

    await this.ensureProfessionalHasSpecialty(profileId, data.specialtyId);

    return prisma.service.create({
      data: {
        ...data,
        profileId,
      },
      include: { specialty: true },
    });
  }

  // actualizar servicio (solo por su dueño)
  static async update(id: number, profileId: number, data: UpdateServiceDTO) {
    this.validateBusinessRules(data);

    const service = await prisma.service.findFirst({
      where: { id, profileId },
    });

    if (!service) {
      throw new Error("No autorizado o no existe");
    }

    if (data.name && data.name !== service.name) {
      await this.ensureUniqueServiceName(profileId, data.name, id);
    }

    if (data.specialtyId && data.specialtyId !== service.specialtyId) {
      await this.ensureProfessionalHasSpecialty(profileId, data.specialtyId);
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
        "No puedes desactivar un servicio con citas futuras agendadas",
      );
    }

    return prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
