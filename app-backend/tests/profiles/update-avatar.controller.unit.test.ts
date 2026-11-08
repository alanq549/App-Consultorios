/// ARCHIVO: tests/profiles/update-avatar.controller.unit.test.ts
/// Pruebas unitarias en memoria para UsersController.updateAvatar (Misión 5 - Fase 4).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { UsersController } from "@/modules/users/users.controller";
import prisma from "@/shared/database/prisma";
import fs from "node:fs";

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
    adminProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("UsersController.updateAvatar (Unit Tests)", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("retorna 400 si req.file no está presente", async () => {
    req = {
      user: { id: 1, role: "CLIENT" },
      file: undefined,
    };

    await UsersController.updateAvatar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "No file uploaded" });
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 400 si el contenido del archivo no coincide con una imagen válida (MIME spoofing / HTML)", async () => {
    req = {
      user: { id: 10, role: "CLIENT" },
      file: {
        filename: "payload.png",
        mimetype: "image/png",
        buffer: Buffer.from("<!DOCTYPE html><html><script>alert(1)</script></html>"),
      },
    };

    await UsersController.updateAvatar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "El contenido del archivo no coincide con un formato de imagen válido",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 400 si el formato detectado no coincide con el MIME declarado (ej. PNG enviado como image/jpeg)", async () => {
    req = {
      user: { id: 10, role: "CLIENT" },
      file: {
        filename: "payload.jpg",
        mimetype: "image/jpeg",
        // Magic bytes de PNG (89 50 4E 47 ...)
        buffer: Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
        ]),
      },
    };

    await UsersController.updateAvatar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "El formato real de la imagen no coincide con el tipo MIME declarado",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("actualiza avatar exitosamente para CLIENT con magic bytes válidos y MIME consistente", async () => {
    req = {
      user: { id: 10, role: "CLIENT" },
      file: {
        filename: "test-avatar.png",
        mimetype: "image/png",
        buffer: Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
        ]),
      },
    };

    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce({
      id: 1,
      userId: 10,
      avatar: null,
    } as any);

    vi.mocked(prisma.clientProfile.update).mockResolvedValueOnce({
      id: 1,
      userId: 10,
      avatar: "/avatars/test-avatar.png",
    } as any);

    await UsersController.updateAvatar(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      avatar: "/avatars/test-avatar.png",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("acepta alias image/jpg y lo normaliza a image/jpeg exitosamente", async () => {
    req = {
      user: { id: 10, role: "CLIENT" },
      file: {
        filename: "test-avatar.jpg",
        mimetype: "image/jpg",
        buffer: Buffer.from([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
        ]),
      },
    };

    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce({
      id: 1,
      userId: 10,
      avatar: null,
    } as any);

    vi.mocked(prisma.clientProfile.update).mockResolvedValueOnce({
      id: 1,
      userId: 10,
      avatar: "/avatars/test-avatar.jpg",
    } as any);

    await UsersController.updateAvatar(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      avatar: "/avatars/test-avatar.jpg",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("propaga errores operativos de filesystem vía next(err) en lugar de reportarlos como error de cliente", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    req = {
      user: { id: 10, role: "CLIENT" },
      file: {
        path: "/tmp/non-existent-device-error.png",
        filename: "test.png",
        mimetype: "image/png",
      },
    };

    // Simulamos que el archivo en req.file.path arroja ENOENT / EIO al intentar abrirlo
    vi.spyOn(fs.promises, "open").mockRejectedValueOnce(
      new Error("EIO: i/o error reading file")
    );

    await UsersController.updateAvatar(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "EIO: i/o error reading file",
      })
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error operativo de filesystem al leer o validar el archivo subido:",
      expect.objectContaining({
        path: "/tmp/non-existent-device-error.png",
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it("mapea ProfileNotFoundError a HTTP 404 via next", async () => {
    req = {
      user: { id: 99, role: "CLIENT" },
      file: {
        filename: "test.png",
        mimetype: "image/png",
        buffer: Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
        ]),
      },
    };

    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce(null);

    await UsersController.updateAvatar(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: expect.stringContaining("no existe"),
      })
    );
  });
});
