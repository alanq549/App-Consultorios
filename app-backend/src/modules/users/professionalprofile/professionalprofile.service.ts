// src/modules/users/professionalprofile/professionalprofile.service.ts
import prisma from "@/core/prisma";
import { PublicProfessionalProfile } from "./professionalprofile.type";
import { SpecialtyStatus } from "@prisma/client";
import {
  UpdateProfessionalProfileDTO,
  CreateCertificateDTO,
  CreateSocialLinkDTO,
  UpdateSocialLinkDTO,
} from "./professionalprofile.dto";

export class ProfessionalProfileService {
  
  static async findByUserId(userId: number) {
    return prisma.professionalProfile.findUnique({
      where: { userId },
    });
  }

  static async me(userId: number) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        specialties: {
          where: { status: SpecialtyStatus.APPROVED },
          include: { specialty: true },
        },
        socialLinks: {
          where: {
            type: {
              in: ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "WEBSITE"],
            },
          },
        },
        certificates: true,
      },
    });

    if (!profile) throw new Error("Perfil profesional no existe");

    const {
      id,
      name,
      lastName,
      phone,
      avatar,
      description,
      verificationStatus,
      specialties,
      socialLinks,
      certificates,
    } = profile;

    return {
      id,
      name,
      lastName,
      phone,
      avatar,
      description,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      verificationStatus,

      specialties: specialties.map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        description: ps.specialty.description,
      })),

      socialLinks: socialLinks.map((link) => ({
        id: link.id,
        type: link.type,
        url: link.url,
      })),

      certificates: certificates.map((cert) => ({
        id: cert.id,
        name: cert.name,
        issuedBy: cert.issuedBy,
        issuedDate: cert.issuedDate,
        fileUrl: cert.fileUrl,
      })),
    };
  }

  static async getPublicById(
    profileId: number,
  ): Promise<PublicProfessionalProfile | null> {
    const profile = await prisma.professionalProfile.findUnique({
      where: { id: profileId },
      include: {
        specialties: {
          where: { status: SpecialtyStatus.APPROVED },
          include: { specialty: true },
        },
        certificates: true,
        socialLinks: true,
      },
    });

    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      avatar: profile.avatar,
      description: profile.description,
      verificationStatus: profile.verificationStatus,

      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,

      socialLinks: profile.socialLinks,

      certificates: profile.certificates.map((c) => ({
        title: c.name,
        fileUrl: c.fileUrl,
      })),

      specialties: profile.specialties.map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        description: ps.specialty.description,
      })),
    };
  }

  // ✅ NUEVO: listar todos los perfiles públicos
  static async getAllPublic(): Promise<PublicProfessionalProfile[]> {
    const profiles = await prisma.professionalProfile.findMany({
      include: {
        specialties: {
          where: { status: SpecialtyStatus.APPROVED },
          include: { specialty: true },
        },
        socialLinks: true,
      },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      avatar: profile.avatar,
      description: profile.description,
      socialLinks: profile.socialLinks,
      verificationStatus: profile.verificationStatus,
      specialties: profile.specialties.map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        description: ps.specialty.description,
      })),
    }));
  }

  /// actualizar perfil
  static async updateProfile(
    userId: number,
    data: UpdateProfessionalProfileDTO,
  ) {
    const hasValidField = Object.values(data).some((v) => v !== undefined);

    if (!hasValidField) {
      throw new Error("No hay campos para actualizar");
    }

    const profile = await prisma.professionalProfile.update({
      where: { userId },
      data,
    });

    return {
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      phone: profile.phone,
      description: profile.description,
    };
  }

  //crear socialLInks
  static async createSocialLink(userId: number, data: CreateSocialLinkDTO) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new Error("Profile no existe");

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

    if (!profile) throw new Error("Profile no existe");

    const link = await prisma.socialLink.findUnique({
      where: { id: socialLinkId },
    });

    if (!link || link.profileId !== profile.id) {
      throw new Error("No autorizado");
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

    if (!profile) throw new Error("Profile no existe");

    const link = await prisma.socialLink.findUnique({
      where: { id: socialLinkId },
    });

    if (!link || link.profileId !== profile.id) {
      throw new Error("No autorizado");
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
      throw new Error("Profile not found");
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

    if (!profile) throw new Error("Profile no existe");

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate || certificate.profileId !== profile.id) {
      throw new Error("No autorizado");
    }

    await prisma.certificate.delete({
      where: { id: certificateId },
    });

    return { message: "Certificado eliminado" };
  }
}
