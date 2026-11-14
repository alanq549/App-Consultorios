/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-active-affiliation-checker.ts
/// Implementación basada en Prisma del puerto ActiveAffiliationChecker.
///
/// Propósito: resolver, con una única consulta, si un perfil profesional está afiliado de forma
/// activa a un tenant activo. Es el predicado del que dependen las superficies operativas que
/// no almacenan `tenantId` (catálogo de servicios, especialidades del profesional).

import type { PrismaClient } from "@prisma/client";
import prismaClient from "@/shared/database/prisma";
import type { ActiveAffiliationChecker } from "../../application/ports/active-affiliation-checker";

export class PrismaActiveAffiliationChecker implements ActiveAffiliationChecker {
  /**
   * @param {Pick<PrismaClient, "professionalTenantAffiliation">} [prisma=prismaClient] - Instancia o subconjunto del cliente de Prisma.
   */
  constructor(
    private readonly prisma: Pick<
      PrismaClient,
      "professionalTenantAffiliation"
    > = prismaClient,
  ) {}

  /**
   * Verifica la afiliación activa del perfil profesional en un tenant activo.
   *
   * @param {number} professionalProfileId - ID del perfil profesional.
   * @param {number} tenantId - ID del tenant seleccionado en la petición.
   * @returns {Promise<boolean>} true si existe la afiliación ACTIVE y el tenant está ACTIVE.
   */
  async hasActiveAffiliation(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<boolean> {
    const affiliation = await this.prisma.professionalTenantAffiliation.findFirst({
      where: {
        professionalProfileId,
        tenantId,
        status: "ACTIVE",
        tenant: {
          is: { status: "ACTIVE" },
        },
      },
      select: { id: true },
    });

    return affiliation !== null;
  }

  /**
   * Resuelve el ID de la afiliación ACTIVE del profesional en un tenant activo.
   *
   * @param {number} professionalProfileId - ID del perfil profesional.
   * @param {number} tenantId - ID del tenant seleccionado en la petición.
   * @returns {Promise<number | null>} El `id` de la afiliación ACTIVE, o `null` si no existe.
   */
  async findActiveAffiliationId(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<number | null> {
    const affiliation = await this.prisma.professionalTenantAffiliation.findFirst({
      where: {
        professionalProfileId,
        tenantId,
        status: "ACTIVE",
        tenant: {
          is: { status: "ACTIVE" },
        },
      },
      select: { id: true },
    });

    return affiliation?.id ?? null;
  }
}
