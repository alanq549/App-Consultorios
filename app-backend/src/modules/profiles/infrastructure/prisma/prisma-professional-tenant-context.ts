/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-professional-tenant-context.ts
/// Implementación basada en Prisma del contrato ProfessionalTenantContextContract.

import { extractPrismaClientFromContext } from "@/shared/database/prisma-transaction-context";
import { TransactionContext } from "@/shared/types/transaction-context";
import {
  ProfessionalTenantContext,
  ProfessionalTenantContextContract,
} from "../../application/ports/professional-tenant-context.port";

export class PrismaProfessionalTenantContext
  implements ProfessionalTenantContextContract
{
  async resolve(params: {
    userId: number;
    tenantId: number;
    tx?: TransactionContext;
  }): Promise<ProfessionalTenantContext> {
    const { userId, tenantId, tx } = params;
    const db = extractPrismaClientFromContext(tx);

    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true },
    });

    if (!profile) {
      return {
        professionalProfileId: null,
        profileApproved: false,
        membershipActive: false,
        affiliationId: null,
      };
    }

    const [membership, affiliation] = await Promise.all([
      db.tenantMembership.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
        select: { status: true, tenant: { select: { status: true } } },
      }),
      db.professionalTenantAffiliation.findFirst({
        where: {
          professionalProfileId: profile.id,
          tenantId,
          status: "ACTIVE",
          tenant: { is: { status: "ACTIVE" } },
        },
        select: { id: true },
      }),
    ]);

    return {
      professionalProfileId: profile.id,
      profileApproved: profile.verificationStatus === "APPROVED",
      membershipActive:
        membership?.status === "ACTIVE" && membership.tenant?.status === "ACTIVE",
      affiliationId: affiliation?.id ?? null,
    };
  }
}
