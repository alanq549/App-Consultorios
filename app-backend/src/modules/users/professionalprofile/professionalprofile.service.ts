// src/modules/users/professionalprofile/professionalprofile.service.ts
import prisma from "@/shared/database/prisma";
import { PublicProfessionalProfile } from "./professionalprofile.type";
import { ProfessionalStatus, SpecialtyStatus } from "@prisma/client";
import {
  UpdateProfessionalProfileDTO,
  CreateCertificateDTO,
  CreateSocialLinkDTO,
  UpdateSocialLinkDTO,
} from "./professionalprofile.dto";
import { NotificationService } from "@/modules/notifications/notifications.service";

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
        status: ps.status,

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
  tenantId: number,
): Promise<PublicProfessionalProfile | null> {
  const affiliation = await prisma.professionalTenantAffiliation.findFirst({
    where: {
      professionalProfileId: profileId,
      tenantId,
      status: "ACTIVE",
      tenant: {
        is: { status: "ACTIVE" },
      },
      professionalProfile: {
        is: {
          user: {
            is: {
              tenantMemberships: {
                some: {
                  tenantId,
                  status: "ACTIVE",
                },
              },
            },
          },
        },
      },
      revisions: {
        some: { status: "APPROVED" },
      },
    },
    select: {
      professionalProfile: {
        select: {
          id: true,
          name: true,
          lastName: true,
          avatar: true,
          ratingAvg: true,
          ratingCount: true,
          verificationStatus: true,
        },
      },
      revisions: {
        where: { status: "APPROVED" },
        orderBy: { revisionNumber: "desc" },
        take: 1,
        select: {
          description: true,
          socialLinks: {
            select: {
              type: true,
              url: true,
            },
          },
        },
      },
    },
  });

  if (!affiliation || affiliation.revisions.length === 0) {
    return null;
  }

  const profile = affiliation.professionalProfile;
  const revision = affiliation.revisions[0];

  return {
    id: profile.id,
    name: profile.name,
    lastName: profile.lastName,
    avatar: profile.avatar,
    description: revision.description,
    verificationStatus: profile.verificationStatus,
    ratingAvg: 0,
    ratingCount: 0,
    socialLinks: revision.socialLinks.map((link) => ({
      type: link.type,
      url: link.url,
    })),
    certificates: [],
    specialties: [],
  };
}

  // ✅ NUEVO: listar todos los perfiles aprobados con su información pública
 static async getAllPublic(
  tenantId: number,
): Promise<PublicProfessionalProfile[]> {
  const affiliations = await prisma.professionalTenantAffiliation.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      tenant: {
        is: { status: "ACTIVE" },
      },
      professionalProfile: {
        is: {
          user: {
            is: {
              tenantMemberships: {
                some: {
                  tenantId,
                  status: "ACTIVE",
                },
              },
            },
          },
        },
      },
      revisions: {
        some: { status: "APPROVED" },
      },
    },
    select: {
      professionalProfile: {
        select: {
          id: true,
          name: true,
          lastName: true,
          avatar: true,
          ratingAvg: true,
          ratingCount: true,
          verificationStatus: true,
        },
      },
      revisions: {
        where: { status: "APPROVED" },
        orderBy: { revisionNumber: "desc" },
        take: 1,
        select: {
          description: true,
          socialLinks: {
            select: {
              type: true,
              url: true,
            },
          },
        },
      },
    },
  });

  return affiliations
    .filter((affiliation) => affiliation.revisions.length > 0)
    .map((affiliation) => {
      const profile = affiliation.professionalProfile;
      const revision = affiliation.revisions[0];

      return {
        id: profile.id,
        name: profile.name,
        lastName: profile.lastName,
        avatar: profile.avatar,
        description: revision.description,
        verificationStatus: profile.verificationStatus,
        ratingAvg: 0,
        ratingCount: 0,
        socialLinks: revision.socialLinks.map((link) => ({
          type: link.type,
          url: link.url,
        })),
        certificates: [],
        specialties: [],
      };
    });
}
 // listar a todos los perfiles (solo para admin)
  static async getAllProfiles() {
  return prisma.professionalProfile.findMany({
    include: {
      specialties: {
        include: { specialty: true },
      },
      socialLinks: true,
    },
  });
}
  /// listar a los perfiles pendientes de aprobación (solo para admin)
  static async getPendingProfiles() {
    return prisma.professionalProfile.findMany({
      where: { verificationStatus: "PENDING" },
      include: {
        specialties: {
          where: { status: SpecialtyStatus.APPROVED },
          include: { specialty: true },
        },
      },
    });
  }

  // suspender o reactivar un perfil (solo para admin)
static async setProfileStatus(
  profileId: number,
  newStatus: ProfessionalStatus,
) {
  const profile = await prisma.professionalProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new Error("Perfil profesional no encontrado");
  }

  const oldStatus = profile.verificationStatus;

  if (oldStatus === newStatus) {
    return profile;
  }

  const allowedTransitions: Record<ProfessionalStatus, ProfessionalStatus[]> = {
    PENDING: ["APPROVED", "REJECTED"],
    APPROVED: ["SUSPENDED"],
    SUSPENDED: ["APPROVED"],
    REJECTED: [],
  };

  if (!allowedTransitions[oldStatus].includes(newStatus)) {
    throw new Error(`Transición inválida de ${oldStatus} a ${newStatus}`);
  }

  if (newStatus === "APPROVED") {
    const approvedSpecialties = await prisma.professionalSpecialty.count({
      where: {
        professionalId: profileId,
        status: "APPROVED",
      },
    });

    if (approvedSpecialties === 0) {
      throw new Error(
        "El perfil no puede aprobarse sin al menos una especialidad aprobada"
      );
    }
  }

  const updated = await prisma.professionalProfile.update({
    where: { id: profileId },
    data: { verificationStatus: newStatus },
  });

  // 🔔 NOTIFICACIONES (SIDE EFFECT)
  if (newStatus === "APPROVED") {
    await NotificationService.notifyProfileApproved(profile.userId);
  }

  if (newStatus === "REJECTED") {
    await NotificationService.notifyProfileRejected(profile.userId);
  }

  if (newStatus === "SUSPENDED") {
    await NotificationService.notifyProfileSuspended(profile.userId);
  }

  return updated;
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

  static async reviewProfile(
    profileId: number,
    status: "APPROVED" | "REJECTED",
  ) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.verificationStatus === status) {
      return profile;
    }

    const updated = await prisma.professionalProfile.update({
      where: { id: profileId },
      data: { verificationStatus: status },
    });

    if (status === "APPROVED") {
      await NotificationService.notifyProfileApproved(profile.userId);
    }

    if (status === "REJECTED") {
      await NotificationService.notifyProfileRejected(profile.userId);
    }

    return updated;
  }
}
