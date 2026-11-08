/// ARCHIVO: tests/profiles/update-avatar.http.test.ts
/// Pruebas de integración HTTP para el endpoint PATCH /api/users/avatar (Misión 5 - Fase 4).

import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import prisma from "@/shared/database/prisma";
import app from "@/app";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";

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

describe("PATCH /api/users/avatar — HTTP Integration (Misión 5)", () => {
  const tokenService = new JwtAccessTokenService();
  const clientToken = tokenService.sign({
    id: 10,
    role: "CLIENT",
  });
  const professionalToken = tokenService.sign({
    id: 20,
    role: "PROFESSIONAL",
  });

  const createdFilesToClean: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Limpieza de archivos de prueba subidos durante los tests
    for (const filePath of createdFilesToClean) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignorar si ya fue eliminado
      }
    }
  });

  it("devuelve 401 si no se incluye el token de autorización", async () => {
    const response = await request(app)
      .patch("/api/users/avatar")
      .attach("avatar", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        filename: "test.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Token requerido" });
  });

  it("devuelve 400 si la petición autenticada no incluye archivo", async () => {
    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${clientToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "No file uploaded" });
  });

  it("devuelve 400 si el archivo subido no es de un tipo MIME de imagen permitido (ej. text/plain)", async () => {
    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${clientToken}`)
      .attach("avatar", Buffer.from("plain text content"), {
        filename: "malicious.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Error al subir archivo",
      })
    );
  });

  it("rechaza peticiones con extensión inconsistente con el MIME declarado (ej. payload.html con image/png)", async () => {
    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${clientToken}`)
      .attach("avatar", Buffer.from("<h1>fake image</h1>"), {
        filename: "payload.html",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Error al subir archivo",
      })
    );
  });

  it("rechaza contenido HTML malicioso declarado como imagen con extensión .png (MIME spoofing / XSS payload)", async () => {
    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${clientToken}`)
      .attach(
        "avatar",
        Buffer.from("<!DOCTYPE html><html><body><script>alert('xss')</script></body></html>"),
        {
          filename: "payload.png",
          contentType: "image/png",
        }
      );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "El contenido del archivo no coincide con un formato de imagen válido",
    });
  });

  it("rechaza peticiones donde el contenido detectado no coincide con el MIME declarado (ej. contenido PNG enviado con MIME image/jpeg)", async () => {
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);

    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${clientToken}`)
      .attach("avatar", validPngBuffer, {
        filename: "mismatch.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "El formato real de la imagen no coincide con el tipo MIME declarado",
    });
  });

  it("actualiza exitosamente el avatar para un CLIENT con magic bytes válidos y retorna la ruta pública /avatars/...", async () => {
    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce({
      id: 1,
      userId: 10,
      name: "Juan",
      lastName: "Perez",
      phone: null,
      avatar: null,
      appointments: [],
    } as any);

    vi.mocked(prisma.clientProfile.update).mockResolvedValueOnce({
      id: 1,
      userId: 10,
      avatar: "/avatars/saved.png",
    } as any);

    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${clientToken}`)
      .attach("avatar", validPngBuffer, {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(200);
    expect(response.body.avatar).toMatch(/^\/avatars\/.+\.png$/);

    // Registrar archivo para limpieza
    const filename = path.basename(response.body.avatar);
    createdFilesToClean.push(
      path.join(process.cwd(), "public", "img", "avatars", filename)
    );

    expect(prisma.clientProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 10 },
        data: expect.objectContaining({
          avatar: expect.stringMatching(/^\/avatars\/.+\.png$/),
        }),
      })
    );
  });

  it("actualiza exitosamente el avatar para un PROFESSIONAL con JPEG válido", async () => {
    vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
      id: 5,
      userId: 20,
      name: "Dra. Ana",
      lastName: "Gomez",
      avatar: null,
      verificationStatus: "APPROVED",
      specialties: [],
      socialLinks: [],
      certificates: [],
    } as any);

    vi.mocked(prisma.professionalProfile.update).mockResolvedValueOnce({
      id: 5,
      userId: 20,
      avatar: "/avatars/pro.jpg",
    } as any);

    const validJpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);

    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${professionalToken}`)
      .attach("avatar", validJpegBuffer, {
        filename: "doctor.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(200);
    expect(response.body.avatar).toMatch(/^\/avatars\/.+\.jpg$/);

    const filename = path.basename(response.body.avatar);
    createdFilesToClean.push(
      path.join(process.cwd(), "public", "img", "avatars", filename)
    );
  });

  it("devuelve 404 si el usuario autenticado no tiene perfil registrado", async () => {
    vi.mocked(prisma.clientProfile.findUnique).mockResolvedValueOnce(null);

    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const response = await request(app)
      .patch("/api/users/avatar")
      .set("Authorization", `Bearer ${clientToken}`)
      .attach("avatar", validPngBuffer, {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("no existe"),
      })
    );
  });

  it("las respuestas estáticas de avatares incluyen la cabecera X-Content-Type-Options: nosniff", async () => {
    const response = await request(app).get("/avatars/sample.png");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
});
