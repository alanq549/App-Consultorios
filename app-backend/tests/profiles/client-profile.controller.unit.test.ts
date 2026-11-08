/// ARCHIVO: tests/profiles/client-profile.controller.unit.test.ts
/// Pruebas unitarias de autorización, validación y privacidad para PATCH /api/users/profile (Misión 2 - Fase 4).

import { describe, expect, it, vi, beforeEach } from "vitest";
import prisma from "@/shared/database/prisma";
import { UsersController } from "@/modules/users/users.controller";
import { AppError } from "@/shared/errors/AppError";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    clientProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    professionalProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("UsersController.updateProfile — Client Profile (Misión 2 - Fase 4)", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("actualiza únicamente campos permitidos (name, lastName, phone) usando el id del actor autenticado", async () => {
    req = {
      user: { id: 42, role: "CLIENT" },
      body: {
        name: "Carlos",
        lastName: "Santana",
        phone: "5551234567",
        // Intento de inyección de campos no permitidos:
        userId: 999,
        email: "hacked@example.com",
        role: "ADMIN",
        appointmentsCount: 100,
      },
    };

    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce({
      id: 1,
      userId: 42,
      name: "Carlos",
      lastName: "Antiguo",
      phone: null,
      avatar: null,
      _count: { appointments: 3 },
    } as any);

    vi.mocked(prisma.clientProfile.update).mockResolvedValueOnce({
      id: 1,
      userId: 42,
      name: "Carlos",
      lastName: "Santana",
      phone: "5551234567",
      avatar: null,
      _count: { appointments: 3 },
    } as any);

    await UsersController.updateProfile(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      name: "Carlos",
      lastName: "Santana",
      phone: "5551234567",
      avatar: null,
      appointmentsCount: 3,
    });

    // Verifica que Prisma SOLO fue invocado con where: { userId: 42 } y los campos permitidos
    expect(prisma.clientProfile.update).toHaveBeenCalledWith({
      where: { userId: 42 },
      data: {
        name: "Carlos",
        lastName: "Santana",
        phone: "5551234567",
      },
      include: {
        _count: { select: { appointments: true } },
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("devuelve error si no se envían campos para actualizar", async () => {
    req = {
      user: { id: 42, role: "CLIENT" },
      body: {},
    };

    await UsersController.updateProfile(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("No hay campos para actualizar");
  });

  it("devuelve 404 si el perfil del cliente autenticado no existe", async () => {
    req = {
      user: { id: 88, role: "CLIENT" },
      body: { name: "Nuevo" },
    };

    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce(null);

    await UsersController.updateProfile(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Perfil de cliente no existe");
  });

  it("rechaza si el rol no está soportado para edición de perfil", async () => {
    req = {
      user: { id: 1, role: "ADMIN" },
      body: { name: "Admin Edit" },
    };

    await UsersController.updateProfile(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Rol no soportado");
  });
});

