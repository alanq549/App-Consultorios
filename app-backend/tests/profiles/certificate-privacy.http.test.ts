/// ARCHIVO: tests/profiles/certificate-privacy.http.test.ts
/// Pruebas de integración HTTP para privacidad y entrega autenticada de certificados (Misión 6 - D6).

import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import prisma from "@/shared/database/prisma";
import app from "@/app";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    certificate: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    professionalProfile: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Certificados — Privacidad, Ownership y Entrega Autenticada (Misión 6 - D6)", () => {
  const tokenService = new JwtAccessTokenService();
  const ownerToken = tokenService.sign({
    id: 42,
    role: "PROFESSIONAL",
  });
  const intruderToken = tokenService.sign({
    id: 99,
    role: "PROFESSIONAL",
  });

  const createdFilesToClean: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
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

  it("la ruta estática anónima /certificates/... devuelve 404 (cierre de bypass estático)", async () => {
    const response = await request(app).get("/certificates/secret-diploma.pdf");
    expect(response.status).toBe(404);
  });

  it("GET /api/professionals/certificates/:id/download devuelve 401 si no hay token", async () => {
    const response = await request(app).get(
      "/api/professionals/certificates/1/download"
    );
    expect(response.status).toBe(401);
  });

  it("GET /api/professionals/certificates/:id/download devuelve 403 Forbidden si el certificado pertenece a otro usuario", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 1,
      name: "Diploma",
      issuedBy: "Universidad",
      issuedDate: new Date(),
      fileUrl: "/certificates/diploma-owner42.pdf",
      profileId: 10,
      profile: {
        userId: 42, // Dueño es 42
      },
    } as any);

    const response = await request(app)
      .get("/api/professionals/certificates/1/download")
      .set("Authorization", `Bearer ${intruderToken}`); // Usuario 99

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "No autorizado para ver este certificado",
    });
  });

  it("GET /api/professionals/certificates/:id/download devuelve 404 si el certificado no existe en base de datos", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/professionals/certificates/999/download")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Certificado no encontrado",
    });
  });

  it("GET /api/professionals/certificates/:id/download devuelve 404 si el archivo físico no existe en disco", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 2,
      name: "Diploma",
      issuedBy: "Universidad",
      issuedDate: new Date(),
      fileUrl: "/certificates/non-existent-physical.pdf",
      profileId: 10,
      profile: {
        userId: 42,
      },
    } as any);

    const response = await request(app)
      .get("/api/professionals/certificates/2/download")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "El archivo del certificado no existe",
    });
  });

  it("el propietario autenticado puede descargar su certificado correctamente", async () => {
    const certDir = path.join(process.cwd(), "public", "certificates");
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    const testFileName = `test-diploma-${Date.now()}.pdf`;
    const testFilePath = path.join(certDir, testFileName);
    fs.writeFileSync(testFilePath, "%PDF-1.4 Mocked Valid PDF Content");
    createdFilesToClean.push(testFilePath);

    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 3,
      name: "Diploma Especialidad",
      issuedBy: "Colegio Médico",
      issuedDate: new Date(),
      fileUrl: `/certificates/${testFileName}`,
      profileId: 10,
      profile: {
        userId: 42,
      },
    } as any);

    const response = await request(app)
      .get("/api/professionals/certificates/3/download")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.header["content-disposition"]).toContain(testFileName);
  });

  it("POST /api/professionals/certificates rechaza extensiones inconsistentes con el MIME (ej. cert.html con application/pdf)", async () => {
    const response = await request(app)
      .post("/api/professionals/certificates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("name", "Certificado Inconsistente")
      .field("issuedBy", "Entidad")
      .field("issuedDate", "2024-01-01T00:00:00.000Z")
      .attach("file", Buffer.from("<h1>fake pdf</h1>"), {
        filename: "payload.html",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Error al subir archivo",
      })
    );
  });

  it("POST /api/professionals/certificates rechaza contenido HTML malicioso declarado como PDF (magic bytes spoofing)", async () => {
    const response = await request(app)
      .post("/api/professionals/certificates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("name", "Certificado Malicioso")
      .field("issuedBy", "Entidad")
      .field("issuedDate", "2024-01-01T00:00:00.000Z")
      .attach(
        "file",
        Buffer.from("<!DOCTYPE html><html><script>alert('xss')</script></html>"),
        {
          filename: "payload.pdf",
          contentType: "application/pdf",
        }
      );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "El contenido del archivo no coincide con un formato de imagen válido",
    });
  });

  it("POST /api/professionals/certificates sube exitosamente un PDF con magic bytes válidos (%PDF)", async () => {
    vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
      id: 10,
      userId: 42,
    } as any);

    vi.mocked(prisma.certificate.create).mockResolvedValueOnce({
      id: 5,
      name: "Título de Especialista",
      issuedBy: "Universidad Médica",
      issuedDate: new Date("2024-01-01"),
      fileUrl: "/certificates/titulo.pdf",
      profileId: 10,
    } as any);

    const validPdfBuffer = Buffer.from("%PDF-1.4 sample valid pdf content");

    const response = await request(app)
      .post("/api/professionals/certificates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("name", "Título de Especialista")
      .field("issuedBy", "Universidad Médica")
      .field("issuedDate", "2024-01-01T00:00:00.000Z")
      .attach("file", validPdfBuffer, {
        filename: "titulo.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(prisma.certificate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profileId: 10,
          name: "Título de Especialista",
          fileUrl: expect.stringMatching(/^\/certificates\/.+\.pdf$/),
        }),
      })
    );

    const createdData = vi.mocked(prisma.certificate.create).mock.calls[0][0].data as any;
    if (createdData?.fileUrl) {
      const createdPath = path.join(process.cwd(), "public", createdData.fileUrl);
      if (fs.existsSync(createdPath)) {
        fs.unlinkSync(createdPath);
      }
    }
  });

  it("DELETE /api/professionals/certificates/:id rechaza a un no-propietario con 403 Forbidden", async () => {
    vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
      id: 999,
      userId: 99, // Intruder
    } as any);

    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 1,
      profileId: 10, // Pertenece a profileId 10
    } as any);

    const response = await request(app)
      .delete("/api/professionals/certificates/1")
      .set("Authorization", `Bearer ${intruderToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "No autorizado para eliminar este certificado",
    });
    expect(prisma.certificate.delete).not.toHaveBeenCalled();
  });

  it("POST /api/professionals/certificates limpia el archivo subido en disco si la persistencia en base de datos falla", async () => {
    vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
      id: 10,
      userId: 42,
    } as any);

    vi.mocked(prisma.certificate.create).mockRejectedValueOnce(
      new Error("Database connection lost during insert")
    );

    const unlinkSpy = vi.spyOn(fs.promises, "unlink");

    const validPdfBuffer = Buffer.from("%PDF-1.4 sample valid pdf content");

    const response = await request(app)
      .post("/api/professionals/certificates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("name", "Título con Fallo")
      .field("issuedBy", "Universidad")
      .field("issuedDate", "2024-01-01T00:00:00.000Z")
      .attach("file", validPdfBuffer, {
        filename: "fallo.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(500);
    // Verifica que se llamó unlink para limpiar el archivo huérfano en disco
    expect(unlinkSpy).toHaveBeenCalledWith(
      expect.stringMatching(/certificates[\\/].+\.pdf$/)
    );
  });

  it("DELETE /api/professionals/certificates/:id registra fallo observable si fs.promises.unlink arroja un error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
      id: 10,
      userId: 42,
    } as any);

    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 7,
      profileId: 10,
      fileUrl: "/certificates/locked-file.pdf",
    } as any);

    vi.mocked(prisma.certificate.delete).mockResolvedValueOnce({
      id: 7,
    } as any);

    vi.spyOn(fs, "existsSync").mockReturnValueOnce(true);
    vi.spyOn(fs.promises, "unlink").mockRejectedValueOnce(
      new Error("EPERM: operation not permitted, unlink")
    );

    const response = await request(app)
      .delete("/api/professionals/certificates/7")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Certificado eliminado" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Fallo observable al eliminar físicamente archivo de certificado en disco:",
      expect.objectContaining({
        certificateId: 7,
        fileUrl: "/certificates/locked-file.pdf",
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it("POST /api/professionals/certificates registra fallo observable si fs.promises.unlink falla al limpiar temporal tras validación inválida", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(prisma.professionalProfile.findUnique).mockResolvedValueOnce({
      id: 10,
      userId: 42,
    } as any);

    const unlinkSpy = vi.spyOn(fs.promises, "unlink").mockRejectedValueOnce(
      new Error("EPERM: unlink operation locked")
    );

    const response = await request(app)
      .post("/api/professionals/certificates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("name", "Certificado Inválido Con Falla Unlink")
      .field("issuedBy", "Entidad")
      .field("issuedDate", "2024-01-01T00:00:00.000Z")
      .attach(
        "file",
        Buffer.from("<!DOCTYPE html><html><body>malicious payload</body></html>"),
        {
          filename: "invalido.pdf",
          contentType: "application/pdf",
        }
      );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "El contenido del archivo no coincide con un formato de imagen válido",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Fallo observable al limpiar archivo de certificado tras error de validación de contenido:",
      expect.objectContaining({
        path: expect.stringMatching(/certificates[\\/].+\.pdf$/),
        error: expect.any(Error),
      })
    );

    const loggedCall = consoleErrorSpy.mock.calls.find((call) =>
      call[0] === "Fallo observable al limpiar archivo de certificado tras error de validación de contenido:"
    );
    if (loggedCall && loggedCall[1]?.path && fs.existsSync(loggedCall[1].path)) {
      fs.unlinkSync(loggedCall[1].path);
    }

    consoleErrorSpy.mockRestore();
    unlinkSpy.mockRestore();
  });
});

