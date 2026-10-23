/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-active-membership-checker.ts
/// Implementación basada en Prisma del puerto ActiveMembershipChecker.
///
/// Propósito: Consultar en la base de datos si un usuario posee membresía activa
/// en un tenant específico y determinar su rol (OWNER o MEMBER).

import type { PrismaClient } from "@prisma/client";
import prismaClient from "@/shared/database/prisma";
import type {
  ActiveMembershipChecker,
  ActiveMembershipContext,
} from "../../application/ports/active-membership-checker";

export class PrismaActiveMembershipChecker implements ActiveMembershipChecker {
  /**
   * @param {Pick<PrismaClient, "tenantMembership">} [prisma=prismaClient] - Instancia o subconjunto del cliente de Prisma.
   */
  constructor(
    private readonly prisma: Pick<PrismaClient, "tenantMembership"> = prismaClient,
  ) {}

  /**
   * Obtiene y valida la membresía activa de un usuario dentro de un tenant específico.
   *
   * @param {number} userId - ID del usuario a consultar.
   * @param {number} tenantId - ID de la sede o consultorio (tenant).
   * @returns {Promise<ActiveMembershipContext | null>} Contexto de membresía activa y rol, o null si no existe o no está activa.
   */
  async getActiveMembership(
    userId: number,
    tenantId: number,
  ): Promise<ActiveMembershipContext | null> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      select: {
        userId: true,
        tenantId: true,
        role: true,
        status: true,
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    if (
      !membership ||
      membership.status !== "ACTIVE" ||
      ((membership as any).tenant && (membership as any).tenant.status !== "ACTIVE")
    ) {
      return null;
    }

    return {
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as "OWNER" | "MEMBER",
    };
  }

  /**
   * Obtiene la membresía activa y bloquea la fila para evitar revocaciones concurrentes.
   * Este método debe ejecutarse dentro de una transacción y utiliza `SELECT FOR UPDATE`.
   */
  async lockActiveMembership(
    userId: number,
    tenantId: number,
  ): Promise<ActiveMembershipContext | null> {
    // Use raw query to acquire a row-level lock on the membership row while checking tenant status.
    const rows = await (this.prisma as any).$queryRaw<any[]>`
      SELECT tm."userId", tm."tenantId", tm."role", tm."status"
      FROM "TenantMembership" tm
      JOIN "Tenant" t ON tm."tenantId" = t."id"
      WHERE tm."userId" = ${userId}
        AND tm."tenantId" = ${tenantId}
        AND t."status" = 'ACTIVE'
      FOR UPDATE OF tm`
    ;
    const membership = rows[0];
    if (!membership || membership.status !== "ACTIVE") {
      return null;
    }
    return {
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as "OWNER" | "MEMBER",
    };
  }

}
