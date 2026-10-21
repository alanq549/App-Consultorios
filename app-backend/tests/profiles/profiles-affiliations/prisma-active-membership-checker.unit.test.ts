/// ARCHIVO: tests/profiles/profiles-affiliations/prisma-active-membership-checker.unit.test.ts

import { describe, expect, it, vi } from "vitest";
import { PrismaActiveMembershipChecker } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-active-membership-checker";

describe("PrismaActiveMembershipChecker", () => {
  it("retorna el contexto cuando la membresía existe y está ACTIVE", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({
      userId: 10,
      tenantId: 1,
      role: "OWNER",
      status: "ACTIVE",
    });

    const checker = new PrismaActiveMembershipChecker({
      tenantMembership: { findUnique: mockFindUnique },
    } as any);

    const result = await checker.getActiveMembership(10, 1);

    expect(result).toEqual({
      userId: 10,
      tenantId: 1,
      role: "OWNER",
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        userId_tenantId: {
          userId: 10,
          tenantId: 1,
        },
      },
      select: {
        userId: true,
        tenantId: true,
        role: true,
        status: true,
      },
    });
  });

  it("retorna null si la membresía no existe", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue(null);

    const checker = new PrismaActiveMembershipChecker({
      tenantMembership: { findUnique: mockFindUnique },
    } as any);

    const result = await checker.getActiveMembership(99, 1);

    expect(result).toBeNull();
  });

  it("retorna null si la membresía existe pero su estado es SUSPENDED", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({
      userId: 10,
      tenantId: 1,
      role: "MEMBER",
      status: "SUSPENDED",
    });

    const checker = new PrismaActiveMembershipChecker({
      tenantMembership: { findUnique: mockFindUnique },
    } as any);

    const result = await checker.getActiveMembership(10, 1);

    expect(result).toBeNull();
  });
});
