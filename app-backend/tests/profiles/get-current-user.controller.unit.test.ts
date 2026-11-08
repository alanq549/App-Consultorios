/// ARCHIVO: tests/profiles/get-current-user.controller.unit.test.ts
/// Pruebas unitarias de UsersController.me y mapeo de errores HTTP (Misión 1 - Fase 4).

import { describe, expect, it, vi, beforeEach } from "vitest";
import prisma from "@/shared/database/prisma";
import { ConfigService } from "@/modules/config/config.service";
import { UsersController } from "@/modules/users/users.controller";
import { AppError } from "@/shared/errors/AppError";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    clientProfile: {
      findUnique: vi.fn(),
    },
    professionalProfile: {
      findUnique: vi.fn(),
    },
    adminProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/modules/config/config.service", () => ({
  ConfigService: {
    getByUser: vi.fn(),
  },
}));

describe("UsersController.me — Unit & Controller Integration (Misión 1 - Fase 4)", () => {
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

  it("devuelve 200 y el perfil de CLIENT con appointmentsCount y config", async () => {
    req = {
      user: { id: 10, role: "CLIENT" },
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 10,
      email: "cliente@consultorios.test",
      isVerified: true,
      role: "CLIENT",
      password: "secret-hash-should-not-leak",
    } as any);

    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce({
      id: 1,
      userId: 10,
      name: "Ana",
      lastName: "Garcia",
      phone: "5551234567",
      avatar: "/avatars/ana.png",
      _count: { appointments: 5 },
    } as any);

    vi.mocked(ConfigService.getByUser).mockResolvedValueOnce({
      id: 100,
      userId: 10,
      language: "es",
      theme: "dark",
      layout: "default",
      preferences: {},
      notificationsEnabled: true,
    } as any);

    await UsersController.me(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      role: "CLIENT",
      email: "cliente@consultorios.test",
      isVerified: true,
      profile: {
        id: 1,
        name: "Ana",
        lastName: "Garcia",
        phone: "5551234567",
        avatar: "/avatars/ana.png",
        appointmentsCount: 5,
      },
      config: {
        id: 100,
        userId: 10,
        language: "es",
        theme: "dark",
        layout: "default",
        preferences: {},
        notificationsEnabled: true,
      },
    });

    const output = res.json.mock.calls[0][0];
    expect(output).not.toHaveProperty("password");
    expect(output).not.toHaveProperty("passwordHash");
    expect(next).not.toHaveBeenCalled();
  });

  it("devuelve 200 y el perfil de PROFESSIONAL con verificationStatus", async () => {
    req = {
      user: { id: 20, role: "PROFESSIONAL" },
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 20,
      email: "dr.test@consultorios.test",
      isVerified: true,
      role: "PROFESSIONAL",
    } as any);

    vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
      id: 2,
      userId: 20,
      name: "Dr. Roberto",
      lastName: "Ruiz",
      phone: "5559876543",
      avatar: "/avatars/roberto.png",
      description: "Médico Especialista",
      ratingAvg: 4.9,
      ratingCount: 12,
      verificationStatus: "APPROVED",
      specialties: [],
      socialLinks: [],
      certificates: [],
    } as any);

    vi.mocked(ConfigService.getByUser).mockResolvedValueOnce({
      theme: "light",
      language: "es",
    } as any);

    await UsersController.me(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const output = res.json.mock.calls[0][0];
    expect(output.role).toBe("PROFESSIONAL");
    expect(output.profile.verificationStatus).toBe("APPROVED");
    expect(output.profile.ratingAvg).toBe(4.9);
    expect(next).not.toHaveBeenCalled();
  });

  it("devuelve 200 y el perfil de ADMIN", async () => {
    req = {
      user: { id: 30, role: "ADMIN" },
    };
    const now = new Date();

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 30,
      email: "admin@consultorios.test",
      isVerified: true,
      role: "ADMIN",
    } as any);

    vi.mocked(prisma.adminProfile.findUnique).mockResolvedValueOnce({
      id: 3,
      userId: 30,
      name: "Admin",
      lastName: "Sistema",
      avatar: null,
      createdAt: now,
      updatedAt: now,
    } as any);

    vi.mocked(ConfigService.getByUser).mockResolvedValueOnce({
      theme: "system",
      language: "es",
    } as any);

    await UsersController.me(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const output = res.json.mock.calls[0][0];
    expect(output.role).toBe("ADMIN");
    expect(output.profile.name).toBe("Admin");
    expect(next).not.toHaveBeenCalled();
  });

  it("llama a next con AppError(404) si el usuario no existe", async () => {
    req = {
      user: { id: 999, role: "CLIENT" },
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    await UsersController.me(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Usuario no existe");
  });

  it("llama a next con AppError(404) si el perfil no existe", async () => {
    req = {
      user: { id: 10, role: "CLIENT" },
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 10,
      email: "cliente@consultorios.test",
      isVerified: true,
      role: "CLIENT",
    } as any);

    vi.mocked(ConfigService.getByUser).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce(null);

    await UsersController.me(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Perfil de cliente no existe");
  });
});

