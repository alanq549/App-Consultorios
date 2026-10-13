/// ARCHIVO: src/modules/tenancy/infrastructure/prisma/prisma-tenant-context-repository.ts
/// Implementación basada en Prisma del puerto TenantContextRepository.
///
/// Propósito: Consultar en la base de datos la relación entre un usuario y un tenant
/// mediante el ORM Prisma, transformando la estructura de datos interna
/// al tipo del dominio (TenantContextRecord).

import prisma from "@/shared/database/prisma";
import type {
  TenantContextRecord,
  TenantContextRepository,
} from "@/modules/tenancy/application/ports/tenant-context-repository";

/**
 * Repositorio de infraestructura que interactúa directamente con la base de datos
 * a través del cliente global de Prisma.
 */
export class PrismaTenantContextRepository
  implements TenantContextRepository
{
  /// Consulta la membresía del usuario en un tenant utilizando la clave compuesta (userId_tenantId).
  /// Retorna la estructura TenantContextRecord mapeada o `null` si no existe la relación.
  async findMembershipContext(
    userId: number,
    tenantId: number,
  ): Promise<TenantContextRecord | null> {
    // Consulta optimizada utilizando campos seleccionados (select) para evitar sobrecarga de datos.
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      select: {
        role: true,
        status: true,
        joinedAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    // Si no se encuentra la membresía, se retorna null cumpliendo el contrato de la interfaz.
    if (!membership) {
      return null;
    }

    // Mapeo del resultado de la base de datos hacia el contrato del dominio (TenantContextRecord).
    return {
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        status: membership.tenant.status,
      },
      membership: {
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
      },
    };
  }
}