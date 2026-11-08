/// ARCHIVO: tests/profiles/update-avatar.use-case.unit.test.ts
/// Pruebas unitarias de UpdateAvatarUseCase desacoplado de fs/storage (Misión 5 - Fase 4).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdateAvatarUseCase } from "@/modules/profiles/application/use-cases/update-avatar.use-case";
import { ClientProfileRepository } from "@/modules/profiles/application/ports/client-profile-repository.port";
import { ProfessionalProfileRepository } from "@/modules/profiles/application/ports/professional-profile-repository.port";
import { AdminProfileRepository } from "@/modules/profiles/application/ports/admin-profile-repository.port";
import { StoragePort } from "@/modules/profiles/application/ports/storage.port";
import {
  ClientProfileNotFoundError,
  ProfessionalProfileNotFoundError,
  AdminProfileNotFoundError,
  UnsupportedRoleError,
} from "@/modules/profiles/domain/profile-errors";

describe("UpdateAvatarUseCase (Misión 5 - Fase 4)", () => {
  const mockClientRepo: ClientProfileRepository = {
    findByUserId: vi.fn(),
    updateByUserId: vi.fn(),
    updateAvatar: vi.fn(),
  };

  const mockProfessionalRepo: ProfessionalProfileRepository = {
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

  const mockAdminRepo: AdminProfileRepository = {
    findByUserId: vi.fn(),
    updateAvatar: vi.fn(),
  };

  const mockStorage: StoragePort = {
    deleteFile: vi.fn(),
  };

  const useCase = new UpdateAvatarUseCase(
    mockClientRepo,
    mockProfessionalRepo,
    mockAdminRepo,
    mockStorage
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza avatar de cliente y elimina el anterior si existe y es diferente", async () => {
    vi.mocked(mockClientRepo.findByUserId).mockResolvedValueOnce({
      id: 1,
      name: "Juan",
      lastName: "Perez",
      phone: null,
      avatar: "/avatars/old-avatar.png",
      appointmentsCount: 0,
    });

    const result = await useCase.execute({
      userId: 1,
      role: "CLIENT",
      newAvatar: "/avatars/new-avatar.png",
    });

    expect(result).toEqual({ avatar: "/avatars/new-avatar.png" });
    expect(mockClientRepo.updateAvatar).toHaveBeenCalledWith(
      1,
      "/avatars/new-avatar.png"
    );
    expect(mockStorage.deleteFile).toHaveBeenCalledWith(
      "/avatars/old-avatar.png"
    );
  });

  it("actualiza avatar de profesional y elimina el anterior si existía", async () => {
    vi.mocked(mockProfessionalRepo.findByUserId).mockResolvedValueOnce({
      id: 2,
      name: "Dra. Maria",
      lastName: "Lopez",
      phone: null,
      avatar: "/avatars/prev.png",
      description: "Desc",
      ratingAvg: 0,
      ratingCount: 0,
      verificationStatus: "APPROVED",
      specialties: [],
      socialLinks: [],
      certificates: [],
    });

    const result = await useCase.execute({
      userId: 2,
      role: "PROFESSIONAL",
      newAvatar: "/avatars/next.png",
    });

    expect(result).toEqual({ avatar: "/avatars/next.png" });
    expect(mockProfessionalRepo.updateAvatar).toHaveBeenCalledWith(
      2,
      "/avatars/next.png"
    );
    expect(mockStorage.deleteFile).toHaveBeenCalledWith("/avatars/prev.png");
  });

  it("actualiza avatar de ADMIN y elimina el anterior si existe y es diferente", async () => {
    vi.mocked(mockAdminRepo.findByUserId).mockResolvedValueOnce({
      id: 3,
      userId: 30,
      name: "Super",
      lastName: "Admin",
      avatar: "/avatars/old-admin.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute({
      userId: 30,
      role: "ADMIN",
      newAvatar: "/avatars/new-admin.png",
    });

    expect(result).toEqual({ avatar: "/avatars/new-admin.png" });
    expect(mockAdminRepo.updateAvatar).toHaveBeenCalledWith(
      30,
      "/avatars/new-admin.png"
    );
    expect(mockStorage.deleteFile).toHaveBeenCalledWith("/avatars/old-admin.png");
  });

  it("no llama a deleteFile si no tenía avatar previo", async () => {
    vi.mocked(mockClientRepo.findByUserId).mockResolvedValueOnce({
      id: 1,
      name: "Juan",
      lastName: "Perez",
      phone: null,
      avatar: null,
      appointmentsCount: 0,
    });

    const result = await useCase.execute({
      userId: 1,
      role: "CLIENT",
      newAvatar: "/avatars/new-avatar.png",
    });

    expect(result).toEqual({ avatar: "/avatars/new-avatar.png" });
    expect(mockStorage.deleteFile).not.toHaveBeenCalled();
  });

  it("no falla si deleteFile del avatar anterior arroja un error (elimina con tolerancia)", async () => {
    vi.mocked(mockProfessionalRepo.findByUserId).mockResolvedValueOnce({
      id: 2,
      name: "Dra. Maria",
      lastName: "Lopez",
      phone: null,
      avatar: "/avatars/prev.png",
      description: "Desc",
      ratingAvg: 0,
      ratingCount: 0,
      verificationStatus: "APPROVED",
      specialties: [],
      socialLinks: [],
      certificates: [],
    });

    vi.mocked(mockStorage.deleteFile).mockRejectedValueOnce(
      new Error("Storage unavailable")
    );

    const result = await useCase.execute({
      userId: 2,
      role: "PROFESSIONAL",
      newAvatar: "/avatars/next.png",
    });

    expect(result).toEqual({ avatar: "/avatars/next.png" });
    expect(mockProfessionalRepo.updateAvatar).toHaveBeenCalledWith(
      2,
      "/avatars/next.png"
    );
  });

  it("si la persistencia en BD falla, preserva el avatar anterior, no borra el viejo y limpia el nuevo archivo subido", async () => {
    vi.mocked(mockClientRepo.findByUserId).mockResolvedValueOnce({
      id: 1,
      name: "Juan",
      lastName: "Perez",
      phone: null,
      avatar: "/avatars/keep-this.png",
      appointmentsCount: 0,
    });

    vi.mocked(mockClientRepo.updateAvatar).mockRejectedValueOnce(
      new Error("Database connection lost")
    );

    await expect(
      useCase.execute({
        userId: 1,
        role: "CLIENT",
        newAvatar: "/avatars/aborted-upload.png",
      })
    ).rejects.toThrow("Database connection lost");

    // No borra el avatar anterior
    expect(mockStorage.deleteFile).not.toHaveBeenCalledWith(
      "/avatars/keep-this.png"
    );
    // Limpia el nuevo archivo huérfano
    expect(mockStorage.deleteFile).toHaveBeenCalledWith(
      "/avatars/aborted-upload.png"
    );
  });

  it("lanza ClientProfileNotFoundError si el perfil de CLIENT no existe y limpia el archivo nuevo", async () => {
    vi.mocked(mockClientRepo.findByUserId).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        userId: 99,
        role: "CLIENT",
        newAvatar: "/avatars/temp.png",
      })
    ).rejects.toThrow(ClientProfileNotFoundError);

    expect(mockStorage.deleteFile).toHaveBeenCalledWith("/avatars/temp.png");
  });

  it("lanza ProfessionalProfileNotFoundError si el perfil de PROFESSIONAL no existe y limpia el archivo nuevo", async () => {
    vi.mocked(mockProfessionalRepo.findByUserId).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        userId: 99,
        role: "PROFESSIONAL",
        newAvatar: "/avatars/temp.png",
      })
    ).rejects.toThrow(ProfessionalProfileNotFoundError);

    expect(mockStorage.deleteFile).toHaveBeenCalledWith("/avatars/temp.png");
  });

  it("lanza AdminProfileNotFoundError si el perfil de ADMIN no existe y limpia el archivo nuevo", async () => {
    vi.mocked(mockAdminRepo.findByUserId).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        userId: 99,
        role: "ADMIN",
        newAvatar: "/avatars/temp.png",
      })
    ).rejects.toThrow(AdminProfileNotFoundError);

    expect(mockStorage.deleteFile).toHaveBeenCalledWith("/avatars/temp.png");
  });

  it("lanza UnsupportedRoleError si el rol no es soportado y limpia el archivo nuevo", async () => {
    await expect(
      useCase.execute({
        userId: 99,
        role: "UNKNOWN" as any,
        newAvatar: "/avatars/temp.png",
      })
    ).rejects.toThrow(UnsupportedRoleError);

    expect(mockStorage.deleteFile).toHaveBeenCalledWith("/avatars/temp.png");
  });
});
