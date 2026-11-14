/// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "@/shared/database/prisma";
import { Role } from "@prisma/client";
import { sendVerificationEmail } from "./auth.mail";
import { RegisterDTO, RegisterResponse } from "./auth.dto";
import { DEFAULT_AVATAR } from "@/core/config/media";

import { z } from "zod";
import { AppError } from "@/shared/errors/AppError";
import { NotificationService } from "../notifications/notifications.service";
import type { CatalogTaxonomyContract } from "@/modules/catalog";
import { createPrismaTransactionContext } from "@/shared/database/prisma-transaction-context";

type RegisterInput = z.infer<typeof RegisterDTO>;

export interface AuthServiceDependencies {
  catalogTaxonomy: CatalogTaxonomyContract;
}

export class AuthService {
  private static dependencies?: AuthServiceDependencies;

  /**
   * Inyecta dependencias desde el Composition Root de aplicación (src/app.wiring.ts).
   * Mantiene al módulo Auth desacoplado del wiring global y de implementaciones concretas.
   */
  static injectDependencies(deps: AuthServiceDependencies): void {
    AuthService.dependencies = deps;
  }

  private static getCatalogTaxonomy(override?: CatalogTaxonomyContract): CatalogTaxonomyContract {
    const contract = override ?? AuthService.dependencies?.catalogTaxonomy;
    if (!contract) {
      throw new Error(
        "[AuthService] CatalogTaxonomyContract no ha sido inyectado. " +
          "Asegúrese de conectar las dependencias desde el composition root.",
      );
    }
    return contract;
  }

  // registro con creación de perfil y envío de email de verificación
  static async register(
    data: RegisterInput,
    depsOverride?: { catalogTaxonomy?: CatalogTaxonomyContract },
  ) {
    const { email, password, role, profile } = data;
    const hashed = await bcrypt.hash(password, 10);
    const catalogTaxonomy = AuthService.getCatalogTaxonomy(depsOverride?.catalogTaxonomy);

    try {
      const { user, token } = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, password: hashed, role },
        });

        if (role === Role.CLIENT) {
          await tx.clientProfile.create({
            data: {
              userId: user.id,
              name: profile.name,
              lastName: profile.lastName,
              phone: profile.phone,
              avatar: DEFAULT_AVATAR,
            },
          });
        } else if (role === Role.PROFESSIONAL) {
          if (!profile.specialtyId)
            throw new Error("Specialty requerida para profesionales");

          const specialtyExists = await catalogTaxonomy.findActiveById(
            profile.specialtyId,
            createPrismaTransactionContext(tx),
          );
          if (!specialtyExists) throw new Error("Specialty inválida");

          await tx.professionalProfile.create({
            data: {
              userId: user.id,
              name: profile.name,
              lastName: profile.lastName,
              phone: profile.phone,
              avatar: DEFAULT_AVATAR,
              description: profile.description ?? "",

              specialties: {
                create: {
                  specialtyId: profile.specialtyId,
                  status: "PENDING", // o APPROVED si decides
                },
              },
            },
          });
        }

        await tx.customConfig.create({ data: { userId: user.id } });

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        await tx.verificationAttempt.create({
          data: {
            userId: user.id,
            token: tokenHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        return { user, token };
      });
      /// enviar email de verificación (token plano, no hash)
      try {
        await sendVerificationEmail(user.email, token);
      } catch (err) {
        console.error("Error enviando email:", err);
      }

      // Crear notificación de bienvenida (fuera de la transacción principal)
      try {
        await NotificationService.notifyWelcome(user.id);
      } catch (err) {
        console.error("Error creando notificación de bienvenida:", err);
      }

      const response: RegisterResponse = {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return response;
    } catch (err: any) {
      // Atrapa errores de Prisma y los lanza como AppError
      if (err.code === "P2002") {
        throw new AppError("Correo ya registrado", 409);
      }
      throw err;
    }
  }

}
