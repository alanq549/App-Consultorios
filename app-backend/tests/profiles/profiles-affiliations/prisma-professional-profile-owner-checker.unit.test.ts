/// ARCHIVO: tests/profiles/profiles-affiliations/prisma-professional-profile-owner-checker.unit.test.ts

import { describe, expect, it, vi } from "vitest";
import { PrismaProfessionalProfileOwnerChecker } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-professional-profile-owner-checker";

describe("PrismaProfessionalProfileOwnerChecker", () => {
  it("returns profile id when user has a professional profile", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({ id: 42 });
    const checker = new PrismaProfessionalProfileOwnerChecker({
      professionalProfile: { findUnique: mockFindUnique },
    } as any);

    const result = await checker.getProfileIdByUserId(10);

    expect(result).toBe(42);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: 10 },
      select: { id: true },
    });
  });

  it("returns null when user does not have a professional profile", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    const checker = new PrismaProfessionalProfileOwnerChecker({
      professionalProfile: { findUnique: mockFindUnique },
    } as any);

    const result = await checker.getProfileIdByUserId(99);

    expect(result).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: 99 },
      select: { id: true },
    });
  });
});
