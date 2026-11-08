/// ARCHIVO: src/modules/profiles/application/use-cases/get-certificate-file.use-case.ts
/// Caso de uso: Acceso privado y autenticado a certificados profesionales (Misión 6 - Fase 4 - D6).

import prisma from "@/shared/database/prisma";
import path from "path";
import fs from "fs";
import {
  CertificateNotFoundError,
  UnauthorizedProfileAccessError,
} from "../../domain/profile-errors";

export class GetCertificateFileUseCase {
  async execute(userId: number, certificateId: number): Promise<{ filePath: string; fileName: string }> {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        profile: {
          select: { userId: true },
        },
      },
    });

    if (!certificate) {
      throw new CertificateNotFoundError("Certificado no encontrado");
    }

    if (certificate.profile.userId !== userId) {
      throw new UnauthorizedProfileAccessError("No autorizado para ver este certificado");
    }

    const fileName = path.basename(certificate.fileUrl);
    const filePath = path.join(process.cwd(), "public", "certificates", fileName);

    if (!fs.existsSync(filePath)) {
      throw new CertificateNotFoundError("El archivo del certificado no existe");
    }

    return { filePath, fileName };
  }
}
