/// ARCHIVO: src/modules/tenancy/infrastructure/prisma/prisma-public-tenant-repository.ts
/// Implementación basada en Prisma del puerto PublicTenantRepository.
///
/// Propósito: Consultar en la base de datos la información pública de un tenant
/// mediante el ORM Prisma, filtrando estrictamente que su estado se encuentre activo.

import prisma from "@/shared/database/prisma";
import type {
  PublicTenantRecord,
  PublicTenantRepository,
} from "@/modules/tenancy/application/ports/public-tenant-repository";

/**
 * Repositorio de infraestructura que realiza consultas de lectura pública
 * sobre la entidad Tenant utilizando Prisma Client.
 */
export class PrismaPublicTenantRepository
  implements PublicTenantRepository
{
  /// Busca un tenant activo en la base de datos por su identificador único (`id`).
  /// Retorna un objeto con el `id` si existe y está activo (`status: "ACTIVE"`), o `null` en caso contrario.
  async findActiveTenantById(
    tenantId: number,
  ): Promise<PublicTenantRecord | null> {
    // Consulta directa a la tabla tenant aplicando filtro por ID y estado activo.
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    return tenant;
  }
}