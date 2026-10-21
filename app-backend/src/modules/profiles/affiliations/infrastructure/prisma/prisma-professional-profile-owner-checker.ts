/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-professional-profile-owner-checker.ts
/// Implementación basada en Prisma del puerto ProfessionalProfileOwnerChecker.
///
/// Propósito: Consultar de manera eficiente la existencia y el ID del perfil profesional
/// perteneciente a un usuario autenticado a partir de su `userId`.

import type { PrismaClient } from "@prisma/client";
import prismaClient from "@/shared/database/prisma";
import type { ProfessionalProfileOwnerChecker } from "../../application/ports/professional-profile-owner-checker";

export class PrismaProfessionalProfileOwnerChecker
  implements ProfessionalProfileOwnerChecker
{
  constructor(
    private readonly prisma: Pick<PrismaClient, "professionalProfile"> = prismaClient,
  ) {}

  /**
   * Obtiene el ID del perfil profesional perteneciente al usuario autenticado.
   * Retorna null si el usuario no tiene perfil profesional registrado.
   *
   * @param userId - ID del usuario autenticado.
   * @returns ID del perfil profesional o null si no existe.
   */
  async getProfileIdByUserId(userId: number): Promise<number | null> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return profile?.id ?? null;
  }
}
