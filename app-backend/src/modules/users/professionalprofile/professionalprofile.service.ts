// src/modules/users/professionalprofile/professionalprofile.service.ts
import prisma from "@/shared/database/prisma";
import path from "node:path";
import fs from "node:fs";
import {
  UpdateProfessionalProfileDTO,
  CreateCertificateDTO,
  CreateSocialLinkDTO,
  UpdateSocialLinkDTO,
} from "./professionalprofile.dto";
import { PrismaProfessionalProfileRepository } from "@/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository";
import { UpdateProfessionalProfileUseCase } from "@/modules/profiles/application/use-cases/update-professional-profile.use-case";
import {
  ProfessionalProfileNotFoundError,
  CertificateNotFoundError,
  SocialLinkNotFoundError,
  UnauthorizedProfileAccessError,
} from "@/modules/profiles/domain/profile-errors";

const professionalProfileRepo = new PrismaProfessionalProfileRepository();
const updateProfessionalProfileUseCase =
  new UpdateProfessionalProfileUseCase(professionalProfileRepo);

export class ProfessionalProfileService {
  static async findByUserId(userId: number) {
    return prisma.professionalProfile.findUnique({
      where: { userId },
    });
  }

  /// actualizar perfil (delega en el caso de uso de perfiles)
  static async updateProfile(
    userId: number,
    data: UpdateProfessionalProfileDTO,
  ) {
    return updateProfessionalProfileUseCase.execute(userId, {
      name: data.name,
      lastName: data.lastName,
      phone: data.phone,
    });
  }

  //crear socialLInks
  static async createSocialLink(userId: number, data: CreateSocialLinkDTO) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ProfessionalProfileNotFoundError("Profile no existe");
    }

    return prisma.socialLink.create({
      data: {
        ...data,
        profileId: profile.id,
      },
    });
  }

  // actualizar socialLinks :
  static async updateSocialLink(
    userId: number,
    socialLinkId: number,
    data: UpdateSocialLinkDTO,
  ) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ProfessionalProfileNotFoundError("Profile no existe");
    }

    const link = await prisma.socialLink.findUnique({
      where: { id: socialLinkId },
    });

    if (!link) {
      throw new SocialLinkNotFoundError("Social link no existe");
    }

    if (link.profileId !== profile.id) {
      throw new UnauthorizedProfileAccessError(
        "No autorizado para modificar este enlace"
      );
    }

    return prisma.socialLink.update({
      where: { id: socialLinkId },
      data,
    });
  }

  // Eliminar socialLinks:
  static async deleteSocialLink(userId: number, socialLinkId: number) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ProfessionalProfileNotFoundError("Profile no existe");
    }

    const link = await prisma.socialLink.findUnique({
      where: { id: socialLinkId },
    });

    if (!link) {
      throw new SocialLinkNotFoundError("Social link no existe");
    }

    if (link.profileId !== profile.id) {
      throw new UnauthorizedProfileAccessError(
        "No autorizado para eliminar este enlace"
      );
    }

    await prisma.socialLink.delete({
      where: { id: socialLinkId },
    });

    return { message: "Social link eliminada" };
  }

  static async createCertificate(
    userId: number,
    data: CreateCertificateDTO & { fileUrl: string },
  ) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ProfessionalProfileNotFoundError("Profile not found");
    }

    return prisma.certificate.create({
      data: {
        ...data,
        profileId: profile.id,
      },
    });
  }

  // Eliminar certificados :
  static async deleteCertificate(userId: number, certificateId: number) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ProfessionalProfileNotFoundError("Profile no existe");
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new CertificateNotFoundError("Certificado no encontrado");
    }

    if (certificate.profileId !== profile.id) {
      throw new UnauthorizedProfileAccessError(
        "No autorizado para eliminar este certificado"
      );
    }

    await prisma.certificate.delete({
      where: { id: certificateId },
    });

    // Limpieza física del archivo en disco con reporte observable
    if (certificate.fileUrl) {
      const fileName = path.basename(certificate.fileUrl);
      const filePath = path.join(
        process.cwd(),
        "public",
        "certificates",
        fileName
      );
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (unlinkErr) {
          console.error(
            "Fallo observable al eliminar físicamente archivo de certificado en disco:",
            {
              certificateId,
              fileUrl: certificate.fileUrl,
              filePath,
              error: unlinkErr,
            }
          );
        }
      }
    }

    return { message: "Certificado eliminado" };
  }
}
