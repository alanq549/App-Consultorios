// src/modules/users/professionalprofile/professionalprofile.service.ts
import prisma from "@/core/prisma";
import { PublicProfessionalProfile } from "./professionalprofile.type";
import { SpecialtyStatus } from "@prisma/client";

export class ProfessionalProfileService {
  static async getPublicById(
    profileId: number
  ): Promise<PublicProfessionalProfile | null> {
    const profile = await prisma.professionalProfile.findUnique({
      where: { id: profileId },
      include: {
        specialties: {
          where: { status: SpecialtyStatus.APPROVED },
          include: { specialty: true },
        },
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
      },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      avatar: profile.avatar,
      description: profile.description,
      verificationStatus: profile.verificationStatus,
      specialties: profile.specialties.map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        description: ps.specialty.description,
      })),
    }));
  }
}