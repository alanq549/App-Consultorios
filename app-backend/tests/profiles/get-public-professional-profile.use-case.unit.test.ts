/// ARCHIVO: tests/profiles/get-public-professional-profile.use-case.unit.test.ts
import { describe, expect, it, vi } from "vitest";
import { GetPublicProfessionalProfileUseCase } from "@/modules/profiles/application/use-cases/get-public-professional-profile.use-case";
import { ListPublicProfessionalProfilesUseCase } from "@/modules/profiles/application/use-cases/list-public-professional-profiles.use-case";
import { ProfessionalProfileRepository } from "@/modules/profiles/application/ports/professional-profile-repository.port";

describe("Public Professional Directory Use Cases (Misión 3 - Fase 4 - D2)", () => {
  const mockRepo: ProfessionalProfileRepository = {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    updateByUserId: vi.fn(),
    updateAvatar: vi.fn(),
    getPublicById: vi.fn(),
    getAllPublic: vi.fn(),
    getAllProfiles: vi.fn(),
    getPendingProfiles: vi.fn(),
    setStatus: vi.fn(),
    executeTransition: vi.fn(),
    reconcileSpecialtyRevocation: vi.fn(),
  };

  const getPublicUseCase = new GetPublicProfessionalProfileUseCase(mockRepo);
  const listPublicUseCase = new ListPublicProfessionalProfilesUseCase(mockRepo);

  it("devuelve el perfil público sin serializar verificationStatus (D2)", async () => {
    vi.mocked(mockRepo.getPublicById).mockResolvedValueOnce({
      id: 1,
      name: "Juan",
      lastName: "Perez",
      avatar: "/avatars/juan.png",
      description: "Bio aprobada del tenant",
      ratingAvg: 0,
      ratingCount: 0,
      socialLinks: [{ type: "WEBSITE", url: "https://example.com" }],
      certificates: [],
      specialties: [],
    });

    const result = await getPublicUseCase.execute(1, 10);

    expect(result).toBeDefined();
    expect(result).not.toHaveProperty("verificationStatus");
    expect(result?.description).toBe("Bio aprobada del tenant");
    expect(mockRepo.getPublicById).toHaveBeenCalledWith(1, 10);
  });

  it("devuelve null si el perfil no cumple los criterios de publicación", async () => {
    vi.mocked(mockRepo.getPublicById).mockResolvedValueOnce(null);

    const result = await getPublicUseCase.execute(99, 10);
    expect(result).toBeNull();
  });

  it("lista perfiles públicos del tenant sin verificationStatus", async () => {
    vi.mocked(mockRepo.getAllPublic).mockResolvedValueOnce([
      {
        id: 1,
        name: "Juan",
        lastName: "Perez",
        avatar: "/avatars/juan.png",
        description: "Bio aprobada",
        ratingAvg: 0,
        ratingCount: 0,
        socialLinks: [],
        certificates: [],
        specialties: [],
      },
    ]);

    const list = await listPublicUseCase.execute(10);

    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("verificationStatus");
    expect(mockRepo.getAllPublic).toHaveBeenCalledWith(10);
  });
});

