/// ARCHIVO: tests/profiles/get-certificate-file.use-case.unit.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GetCertificateFileUseCase } from "@/modules/profiles/application/use-cases/get-certificate-file.use-case";
import {
  CertificateNotFoundError,
  UnauthorizedProfileAccessError,
} from "@/modules/profiles/domain/profile-errors";
import prisma from "@/shared/database/prisma";
import fs from "fs";

vi.mock("@/shared/database/prisma", () => ({
  default: {
    certificate: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

describe("GetCertificateFileUseCase — Private Delivery (Misión 6 - D6)", () => {
  const useCase = new GetCertificateFileUseCase();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve la ruta y nombre de archivo para el dueño del certificado", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 1,
      name: "Diploma",
      issuedBy: "Universidad",
      issuedDate: new Date(),
      fileUrl: "/certificates/diploma-123.pdf",
      profileId: 10,
      profile: {
        userId: 42,
      },
    } as any);

    vi.mocked(fs.existsSync).mockReturnValueOnce(true);

    const result = await useCase.execute(42, 1);

    expect(result.fileName).toBe("diploma-123.pdf");
    expect(result.filePath).toContain("diploma-123.pdf");
  });

  it("rechaza el acceso con UnauthorizedProfileAccessError si el usuario no es el dueño", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 1,
      name: "Diploma",
      issuedBy: "Universidad",
      issuedDate: new Date(),
      fileUrl: "/certificates/diploma-123.pdf",
      profileId: 10,
      profile: {
        userId: 42, // Dueño es 42
      },
    } as any);

    await expect(useCase.execute(99, 1)).rejects.toThrow(
      UnauthorizedProfileAccessError
    );
  });

  it("lanza CertificateNotFoundError si el certificado no existe en BD", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce(null);

    await expect(useCase.execute(42, 999)).rejects.toThrow(
      CertificateNotFoundError
    );
  });

  it("lanza CertificateNotFoundError si el archivo físico no existe en disco", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValueOnce({
      id: 1,
      name: "Diploma",
      issuedBy: "Universidad",
      issuedDate: new Date(),
      fileUrl: "/certificates/diploma-missing.pdf",
      profileId: 10,
      profile: {
        userId: 42,
      },
    } as any);

    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await expect(useCase.execute(42, 1)).rejects.toThrow(
      CertificateNotFoundError
    );
  });
});

