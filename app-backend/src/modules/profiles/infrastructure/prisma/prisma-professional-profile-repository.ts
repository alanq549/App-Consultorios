/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-professional-profile-repository.ts
import prisma from "@/shared/database/prisma";
import { PrismaClient, ProfessionalStatus } from "@prisma/client";
import { ProfessionalProfileRepository } from "../../application/ports/professional-profile-repository.port";
import {
  ProfessionalProfileMeDTO,
  PublicProfessionalProfileDTO,
  UpdateProfessionalProfileInput,
} from "../../application/dtos/professional-profile.dto";
import { ProfessionalStatusMachine } from "../../domain/professional-status-machine";
import { ProfessionalProfileNotFoundError } from "../../domain/profile-errors";
import { CatalogSpecialtyChecker } from "../../application/ports/catalog-specialty-checker.port";

export class PrismaProfessionalProfileRepository
  implements ProfessionalProfileRepository
{
  async findByUserId(userId: number): Promise<ProfessionalProfileMeDTO | null> {
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

    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      phone: profile.phone,
      avatar: profile.avatar,
      description: profile.description,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      verificationStatus: profile.verificationStatus,
      specialties: profile.specialties.map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        description: ps.specialty.description,
        status: ps.status,
      })),
      socialLinks: profile.socialLinks.map((link) => ({
        id: link.id,
        type: link.type,
        url: link.url,
      })),
      certificates: profile.certificates.map((cert) => ({
        id: cert.id,
        name: cert.name,
        issuedBy: cert.issuedBy,
        issuedDate: cert.issuedDate,
        fileUrl: cert.fileUrl,
      })),
    };
  }

  async findById(
    id: number,
    txClient?: unknown
  ): Promise<ProfessionalProfileMeDTO | null> {
    const db = (txClient as typeof prisma) ?? prisma;
    const profile = await db.professionalProfile.findUnique({
      where: { id },
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

    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      phone: profile.phone,
      avatar: profile.avatar,
      description: profile.description,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      verificationStatus: profile.verificationStatus,
      specialties: profile.specialties.map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        description: ps.specialty.description,
        status: ps.status,
      })),
      socialLinks: profile.socialLinks.map((link) => ({
        id: link.id,
        type: link.type,
        url: link.url,
      })),
      certificates: profile.certificates.map((cert) => ({
        id: cert.id,
        name: cert.name,
        issuedBy: cert.issuedBy,
        issuedDate: cert.issuedDate,
        fileUrl: cert.fileUrl,
      })),
    };
  }

  async updateByUserId(
    userId: number,
    data: UpdateProfessionalProfileInput
  ): Promise<{
    id: number;
    name: string;
    lastName: string | null;
    phone: string | null;
    description: string;
  }> {
    const updateData: {
      name?: string;
      lastName?: string | null;
      phone?: string | null;
    } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const profile = await prisma.professionalProfile.update({
      where: { userId },
      data: updateData,
    });

    return {
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      phone: profile.phone,
      description: profile.description,
    };
  }

  async updateAvatar(userId: number, avatar: string): Promise<void> {
    await prisma.professionalProfile.update({
      where: { userId },
      data: { avatar },
    });
  }

  /**
   * Obtiene la proyección pública del profesional.
   * Criterios de visibilidad aprobados en Fase 4 (D2):
   * 1. Afiliación activa con el tenant activo.
   * 2. Membresía activa del usuario en el tenant.
   * 3. Al menos una revisión aprobada en la afiliación (de la cual se toma bio y links).
   * 4. Estado de verificación global APPROVED.
   * 5. Al menos una especialidad con estado global APPROVED.
   * 6. NO serializa verificationStatus en la respuesta pública.
   */
  async getPublicById(
    profileId: number,
    tenantId: number
  ): Promise<PublicProfessionalProfileDTO | null> {
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
            verificationStatus: "APPROVED",
            specialties: {
              some: { status: "APPROVED" },
            },
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

  async getAllPublic(tenantId: number): Promise<PublicProfessionalProfileDTO[]> {
    const affiliations = await prisma.professionalTenantAffiliation.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        tenant: {
          is: { status: "ACTIVE" },
        },
        professionalProfile: {
          is: {
            verificationStatus: "APPROVED",
            specialties: {
              some: { status: "APPROVED" },
            },
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

  async getAllProfiles(): Promise<unknown[]> {
    return prisma.professionalProfile.findMany({
      include: {
        specialties: {
          include: { specialty: true },
        },
        socialLinks: true,
      },
    });
  }

  async getPendingProfiles(): Promise<unknown[]> {
    return prisma.professionalProfile.findMany({
      where: { verificationStatus: "PENDING" },
      include: {
        specialties: {
          where: { status: "APPROVED" },
          include: { specialty: true },
        },
      },
    });
  }

  async setStatus(
    profileId: number,
    status: ProfessionalStatus,
    txClient?: unknown
  ): Promise<{
    id: number;
    userId: number;
    verificationStatus: ProfessionalStatus;
  }> {
    const db = (txClient as PrismaClient) ?? prisma;
    const updated = await db.professionalProfile.update({
      where: { id: profileId },
      data: { verificationStatus: status },
      select: {
        id: true,
        userId: true,
        verificationStatus: true,
      },
    });

    return updated;
  }

  /**
   * Ejecuta una transición de estado de forma atómica:
   * 1. Adquiere un bloqueo a nivel de fila (`FOR UPDATE`) en PostgreSQL para serializar cualquier revisión concurrente.
   * 2. Relee el estado actual del perfil bajo el lock.
   * 3. Si el estado es igual al solicitado, retorna de forma idempotente.
   * 4. Si el estado solicitado es APPROVED, valida la cantidad de especialidades aprobadas dentro de la misma transacción.
   * 5. Evalúa la máquina de estados de dominio (ProfessionalStatusMachine).
   * 6. Actualiza el estado con compare-and-set atómico.
   *
   * Si se pasa un `txClient` externo (ej. Catalog al revocar especialidades), opera sobre dicho contexto
   * sin abrir transacciones independientes.
   */
  async executeTransition(
    profileId: number,
    targetStatus: ProfessionalStatus,
    specialtyChecker: CatalogSpecialtyChecker,
    txClient?: unknown
  ): Promise<{
    id: number;
    userId: number;
    verificationStatus: ProfessionalStatus;
    previousStatus: ProfessionalStatus;
  }> {
    const run = async (tx: any) => {
      // Row lock FOR UPDATE obligatorio: serializa transiciones concurrentes
      const rows = await tx.$queryRaw<
        Array<{
          id: number;
          userId: number;
          verificationStatus: ProfessionalStatus;
        }>
      >`
        SELECT id, "userId", "verificationStatus"
        FROM "ProfessionalProfile"
        WHERE id = ${profileId}
        FOR UPDATE
      `;
      const profile = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      if (!profile) {
        throw new ProfessionalProfileNotFoundError(
          "Perfil profesional no encontrado"
        );
      }

      if (profile.verificationStatus === targetStatus) {
        return {
          id: profile.id,
          userId: profile.userId,
          verificationStatus: profile.verificationStatus,
          previousStatus: profile.verificationStatus,
        };
      }

      let approvedSpecialtiesCount = 0;
      if (targetStatus === "APPROVED") {
        approvedSpecialtiesCount =
          await specialtyChecker.countApprovedSpecialties(profileId, tx);
      }

      // Validar según las reglas de la máquina de estados
      ProfessionalStatusMachine.validateTransition(
        profile.verificationStatus,
        targetStatus,
        approvedSpecialtiesCount
      );

      // Compare-and-Set atómico
      const updated = await tx.professionalProfile.update({
        where: { id: profileId },
        data: { verificationStatus: targetStatus },
        select: {
          id: true,
          userId: true,
          verificationStatus: true,
        },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        verificationStatus: updated.verificationStatus,
        previousStatus: profile.verificationStatus,
      };
    };

    if (txClient) {
      return run(txClient);
    }

    return prisma.$transaction((tx) => run(tx));
  }

  /**
   * Reconcilia de manera atómica bajo row-level lock (FOR UPDATE) la revocación de especialidades:
   * 1. Adquiere el bloqueo pesimista en PostgreSQL para serializar aprobaciones o revisiones concurrentes.
   * 2. Relee el estado bajo el lock.
   * 3. Si el estado es REJECTED (terminal), PENDING o ya SUSPENDED, no transiciona a SUSPENDED.
   * 4. Si el estado es APPROVED y no quedan especialidades aprobadas, actualiza a SUSPENDED.
   */
  async reconcileSpecialtyRevocation(
    profileId: number,
    specialtyChecker: CatalogSpecialtyChecker,
    txClient: unknown
  ): Promise<{
    profileSuspended: boolean;
    previousStatus: ProfessionalStatus;
  }> {
    const tx = (txClient as any) || prisma;

    // Row lock FOR UPDATE obligatorio: serializa la reconciliación con transiciones concurrentes
    const rows = await tx.$queryRaw<
      Array<{
        id: number;
        verificationStatus: ProfessionalStatus;
      }>
    >`
      SELECT id, "verificationStatus"
      FROM "ProfessionalProfile"
      WHERE id = ${profileId}
      FOR UPDATE
    `;
    const profile = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!profile) {
      return { profileSuspended: false, previousStatus: "PENDING" };
    }

    if (profile.verificationStatus !== "APPROVED") {
      return {
        profileSuspended: false,
        previousStatus: profile.verificationStatus,
      };
    }

    const remainingApproved = await specialtyChecker.countApprovedSpecialties(
      profileId,
      tx
    );

    if (remainingApproved === 0) {
      await tx.professionalProfile.update({
        where: { id: profileId },
        data: { verificationStatus: "SUSPENDED" },
      });

      return {
        profileSuspended: true,
        previousStatus: profile.verificationStatus,
      };
    }

    return {
      profileSuspended: false,
      previousStatus: profile.verificationStatus,
    };
  }
}

