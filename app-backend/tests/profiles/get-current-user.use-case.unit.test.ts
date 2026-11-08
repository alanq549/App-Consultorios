/// ARCHIVO: tests/profiles/get-current-user.use-case.unit.test.ts
import { describe, expect, it, vi } from "vitest";
import { GetCurrentUserUseCase } from "@/modules/profiles/application/use-cases/get-current-user.use-case";
import { UserIdentityReader } from "@/modules/profiles/application/ports/user-identity-reader.port";
import { ClientProfileRepository } from "@/modules/profiles/application/ports/client-profile-repository.port";
import { ProfessionalProfileRepository } from "@/modules/profiles/application/ports/professional-profile-repository.port";
import { AdminProfileRepository } from "@/modules/profiles/application/ports/admin-profile-repository.port";
import { UserConfigReader } from "@/modules/profiles/application/ports/user-config-reader.port";
import {
  UserProfileNotFoundError,
  ClientProfileNotFoundError,
  ProfessionalProfileNotFoundError,
  AdminProfileNotFoundError,
  UnsupportedRoleError,
} from "@/modules/profiles/domain/profile-errors";

describe("GetCurrentUserUseCase (Misión 1 - Fase 4)", () => {
  const mockIdentityReader: UserIdentityReader = {
    findById: vi.fn(),
  };

  const mockClientProfileRepo: ClientProfileRepository = {
    findByUserId: vi.fn(),
    updateByUserId: vi.fn(),
    updateAvatar: vi.fn(),
  };

  const mockProfessionalProfileRepo: ProfessionalProfileRepository = {
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

  const mockAdminProfileRepo: AdminProfileRepository = {
    findByUserId: vi.fn(),
    updateAvatar: vi.fn(),
  };

  const mockConfigReader: UserConfigReader = {
    getConfig: vi.fn(),
  };

  const useCase = new GetCurrentUserUseCase(
    mockIdentityReader,
    mockClientProfileRepo,
    mockProfessionalProfileRepo,
    mockAdminProfileRepo,
    mockConfigReader
  );

  it("devuelve el payload correcto para un usuario con rol CLIENT", async () => {
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce({
      id: 1,
      email: "client@example.com",
      isVerified: true,
      role: "CLIENT",
    });

    vi.mocked(mockConfigReader.getConfig).mockResolvedValueOnce({
      theme: "dark",
      language: "es",
    });

    vi.mocked(mockClientProfileRepo.findByUserId).mockResolvedValueOnce({
      id: 10,
      name: "Juan",
      lastName: "Perez",
      phone: "1234567890",
      avatar: "/avatars/juan.png",
      appointmentsCount: 3,
    });

    const result = await useCase.execute({ userId: 1, role: "CLIENT" });

    expect(result).toEqual({
      role: "CLIENT",
      email: "client@example.com",
      isVerified: true,
      profile: {
        id: 10,
        name: "Juan",
        lastName: "Perez",
        phone: "1234567890",
        avatar: "/avatars/juan.png",
        appointmentsCount: 3,
      },
      config: {
        theme: "dark",
        language: "es",
      },
    });
  });

  it("devuelve el payload correcto para un usuario con rol PROFESSIONAL (incluyendo verificationStatus)", async () => {
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce({
      id: 2,
      email: "dr@example.com",
      isVerified: true,
      role: "PROFESSIONAL",
    });

    vi.mocked(mockConfigReader.getConfig).mockResolvedValueOnce({
      theme: "light",
      language: "en",
    });

    vi.mocked(mockProfessionalProfileRepo.findByUserId).mockResolvedValueOnce({
      id: 20,
      name: "Dra. Maria",
      lastName: "Lopez",
      phone: "0987654321",
      avatar: "/avatars/maria.png",
      description: "Cirujana experta",
      ratingAvg: 4.8,
      ratingCount: 15,
      verificationStatus: "APPROVED",
      specialties: [],
      socialLinks: [],
      certificates: [],
    });

    const result = await useCase.execute({ userId: 2, role: "PROFESSIONAL" });

    expect(result.role).toBe("PROFESSIONAL");
    expect(result.email).toBe("dr@example.com");
    expect((result.profile as any).verificationStatus).toBe("APPROVED");
    expect((result.profile as any).ratingAvg).toBe(4.8);
  });

  it("devuelve el payload correcto para un usuario con rol ADMIN", async () => {
    const now = new Date();
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce({
      id: 3,
      email: "admin@example.com",
      isVerified: true,
      role: "ADMIN",
    });

    vi.mocked(mockConfigReader.getConfig).mockResolvedValueOnce({
      theme: "system",
      language: "es",
    });

    vi.mocked(mockAdminProfileRepo.findByUserId).mockResolvedValueOnce({
      id: 30,
      userId: 3,
      name: "Super",
      lastName: "Admin",
      avatar: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await useCase.execute({ userId: 3, role: "ADMIN" });

    expect(result.role).toBe("ADMIN");
    expect(result.email).toBe("admin@example.com");
    expect((result.profile as any).name).toBe("Super");
  });

  it("lanza UserProfileNotFoundError si el usuario no existe en Identity", async () => {
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ userId: 999, role: "CLIENT" })
    ).rejects.toThrow(UserProfileNotFoundError);
  });

  it("lanza ClientProfileNotFoundError si el perfil de cliente no existe", async () => {
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce({
      id: 1,
      email: "client@example.com",
      isVerified: true,
      role: "CLIENT",
    });
    vi.mocked(mockConfigReader.getConfig).mockResolvedValueOnce({});
    vi.mocked(mockClientProfileRepo.findByUserId).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ userId: 1, role: "CLIENT" })
    ).rejects.toThrow(ClientProfileNotFoundError);
  });

  it("lanza ProfessionalProfileNotFoundError si el perfil profesional no existe", async () => {
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce({
      id: 2,
      email: "dr@example.com",
      isVerified: true,
      role: "PROFESSIONAL",
    });
    vi.mocked(mockConfigReader.getConfig).mockResolvedValueOnce({});
    vi.mocked(mockProfessionalProfileRepo.findByUserId).mockResolvedValueOnce(
      null
    );

    await expect(
      useCase.execute({ userId: 2, role: "PROFESSIONAL" })
    ).rejects.toThrow(ProfessionalProfileNotFoundError);
  });

  it("lanza AdminProfileNotFoundError si el perfil de admin no existe", async () => {
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce({
      id: 3,
      email: "admin@example.com",
      isVerified: true,
      role: "ADMIN",
    });
    vi.mocked(mockConfigReader.getConfig).mockResolvedValueOnce({});
    vi.mocked(mockAdminProfileRepo.findByUserId).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ userId: 3, role: "ADMIN" })
    ).rejects.toThrow(AdminProfileNotFoundError);
  });

  it("lanza UnsupportedRoleError si el rol no es soportado", async () => {
    vi.mocked(mockIdentityReader.findById).mockResolvedValueOnce({
      id: 4,
      email: "unknown@example.com",
      isVerified: true,
      role: "UNKNOWN" as any,
    });
    vi.mocked(mockConfigReader.getConfig).mockResolvedValueOnce({});

    await expect(
      useCase.execute({ userId: 4, role: "UNKNOWN" as any })
    ).rejects.toThrow(UnsupportedRoleError);
  });
});

