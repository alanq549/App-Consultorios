/// ARCHIVO: tests/profiles/client-profile.use-cases.unit.test.ts
import { describe, expect, it, vi } from "vitest";
import { GetClientProfileUseCase } from "@/modules/profiles/application/use-cases/get-client-profile.use-case";
import { UpdateClientProfileUseCase } from "@/modules/profiles/application/use-cases/update-client-profile.use-case";
import { ClientProfileRepository } from "@/modules/profiles/application/ports/client-profile-repository.port";
import {
  ClientProfileNotFoundError,
  InvalidProfileDataError,
} from "@/modules/profiles/domain/profile-errors";

describe("ClientProfile Use Cases (Misión 2 - Fase 4)", () => {
  const mockRepo: ClientProfileRepository = {
    findByUserId: vi.fn(),
    updateByUserId: vi.fn(),
    updateAvatar: vi.fn(),
  };

  const getUseCase = new GetClientProfileUseCase(mockRepo);
  const updateUseCase = new UpdateClientProfileUseCase(mockRepo);

  describe("GetClientProfileUseCase", () => {
    it("retorna el perfil de cliente existente", async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValueOnce({
        id: 1,
        name: "Carlos",
        lastName: "Gomez",
        phone: "5551234567",
        avatar: null,
        appointmentsCount: 2,
      });

      const result = await getUseCase.execute(10);
      expect(result.id).toBe(1);
      expect(result.name).toBe("Carlos");
      expect(result.appointmentsCount).toBe(2);
    });

    it("lanza ClientProfileNotFoundError si no existe el perfil", async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValueOnce(null);

      await expect(getUseCase.execute(99)).rejects.toThrow(
        ClientProfileNotFoundError
      );
    });
  });

  describe("UpdateClientProfileUseCase", () => {
    it("actualiza los campos permitidos del perfil", async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValueOnce({
        id: 1,
        name: "Carlos",
        lastName: "Gomez",
        phone: "5551234567",
        avatar: null,
        appointmentsCount: 2,
      });

      vi.mocked(mockRepo.updateByUserId).mockResolvedValueOnce({
        id: 1,
        name: "Carlos Alberto",
        lastName: "Gomez Perez",
        phone: "5559876543",
        avatar: null,
        appointmentsCount: 2,
      });

      const updated = await updateUseCase.execute(10, {
        name: "Carlos Alberto",
        lastName: "Gomez Perez",
        phone: "5559876543",
      });

      expect(updated.name).toBe("Carlos Alberto");
      expect(updated.phone).toBe("5559876543");
      expect(mockRepo.updateByUserId).toHaveBeenCalledWith(10, {
        name: "Carlos Alberto",
        lastName: "Gomez Perez",
        phone: "5559876543",
      });
    });

    it("lanza InvalidProfileDataError si todos los campos son indefinidos", async () => {
      await expect(
        updateUseCase.execute(10, {
          name: undefined,
          lastName: undefined,
          phone: undefined,
        })
      ).rejects.toThrow(InvalidProfileDataError);
    });

    it("lanza ClientProfileNotFoundError si el perfil a actualizar no existe", async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValueOnce(null);

      await expect(
        updateUseCase.execute(10, {
          name: "Nuevo Nombre",
        })
      ).rejects.toThrow(ClientProfileNotFoundError);
    });
  });
});

