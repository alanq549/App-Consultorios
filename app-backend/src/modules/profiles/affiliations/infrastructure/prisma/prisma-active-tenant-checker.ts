/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-active-tenant-checker.ts
/// Implementación basada en Prisma del puerto ActiveTenantChecker.

import type { PrismaClient, Prisma } from "@prisma/client";
import prismaClient from "@/shared/database/prisma";
import type { ActiveTenantChecker } from "../../application/ports/active-tenant-checker";

export class PrismaActiveTenantChecker implements ActiveTenantChecker {
  constructor(
    private readonly client: { tenant: Pick<PrismaClient["tenant"], "findFirst"> } = prismaClient,
  ) {}

  /**
   * Determina si el tenant existe y su status es ACTIVE.
   */
  async isActiveTenant(tenantId: number): Promise<boolean> {
    const tenant = await this.client.tenant.findFirst({
      where: {
        id: tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    return Boolean(tenant);
  }
}
