import prisma from "@/shared/database/prisma";
import { CreateReviewInput } from "./reviews.dto";
import { Prisma } from "@prisma/client";
import { NotificationService } from "../notifications/notifications.service";
import { AppError } from "@/shared/errors/AppError";
import { PrismaActiveAffiliationChecker } from "@/modules/profiles/affiliations/infrastructure/prisma/prisma-active-affiliation-checker";

/// Alcance multi-tenant de las reseñas: `Review` no guarda `tenantId`, así que la pertenencia del
/// profesional al tenant solicitado se deriva de su afiliación activa. Las superficies por
/// propiedad (crear, leer por cita y leer por lote) se acotan a la participación del usuario
/// autenticado en la cita y no asumen ningún tenant por defecto.
const activeAffiliationChecker = new PrismaActiveAffiliationChecker();


export class ReviewsService {

  static async create(userId: number, data: CreateReviewInput) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId },
    include: {
      review: true,
      // Se necesita el `userId` del profesional (no el id de su perfil) para notificarle.
      professional: { select: { userId: true } },
    },
  });

  if (!appointment) throw new AppError("Cita no encontrada", 404);

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId },
  });

  if (!clientProfile) throw new AppError("Perfil de cliente no encontrado", 404);

  // Sólo el cliente dueño de la cita puede reseñarla. La denegación es uniforme (404) para no
  // revelar la existencia de citas ajenas.
  if (appointment.clientProfileId !== clientProfile.id)
    throw new AppError("Cita no encontrada", 404);

  if (appointment.status !== "COMPLETED")
    throw new AppError("La cita no está completada", 400);

  if (appointment.review) throw new AppError("La reseña ya existe", 409);

  const review = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        appointmentId: data.appointmentId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    await this.updateProfessionalRating(
      tx,
      appointment.professionalProfileId,
      data.rating,
    );

    return review;
  });

  // La notificación es best-effort: la reseña y el rating ya quedaron confirmados en la
  // transacción y no deben revertirse (ni devolver error al cliente) si falla el aviso.
  try {
    await NotificationService.notifyReview(
      appointment.professional.userId,
      appointment.id,
    );
  } catch (error) {
    console.error("No se pudo notificar la nueva reseña al profesional", error);
  }

  return review;
}

     /// Lectura pública del listado de reseñas de un profesional. Devuelve `null` cuando el
     /// profesional no tiene afiliación activa en el tenant solicitado, de modo que el controlador
     /// responda el mismo 404 uniforme que el resto del catálogo público.
     static async getProfessionalReviews(professionalProfileId: number, tenantId: number) {
        const isAffiliated = await activeAffiliationChecker.hasActiveAffiliation(
          professionalProfileId,
          tenantId,
        );

        if (!isAffiliated) {
          return null;
        }

        return prisma.review.findMany({
        where: {
            appointment: {
            professionalProfileId,
            },
        },
        include: {
            appointment: {
            include: {
                // Proyección pública: sólo los datos de presentación del cliente. Se excluyen
                // contacto (phone) e identificadores internos (userId), que el middleware de tenant
                // no limita.
                clientProfile: {
                select: { name: true, lastName: true, avatar: true },
                },
            },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        });
    }

    /// Lectura por propiedad: sólo el cliente dueño de la cita o su profesional pueden leer la
    /// reseña. Cualquier otro usuario obtiene `null` (404 uniforme en el controlador).
    static async getByAppointment(appointmentId: number, userId: number) {
        const isParticipant = await this.isAppointmentParticipant(
          appointmentId,
          userId,
        );

        if (!isParticipant) {
          return null;
        }

        return prisma.review.findUnique({
        where: { appointmentId },
        });
    }

    /// Lectura por propiedad en lote: se descartan los IDs de citas en las que el usuario no
    /// participa, de modo que nunca se filtran reseñas ajenas aunque el cliente los solicite.
    static async getByAppointments(appointmentIds: number[], userId: number) {
  return prisma.review.findMany({
    where: {
      appointmentId: {
        in: appointmentIds,
      },
      appointment: {
        OR: [{ clientProfile: { userId } }, { professional: { userId } }],
      },
    },
  });
}

  /// Determina si el usuario participa en la cita (como cliente dueño o como profesional).
  private static async isAppointmentParticipant(
    appointmentId: number,
    userId: number,
  ): Promise<boolean> {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        OR: [{ clientProfile: { userId } }, { professional: { userId } }],
      },
      select: { id: true },
    });

    return appointment !== null;
  }

  static async updateProfessionalRating(
    tx: Prisma.TransactionClient,
    professionalProfileId: number,
    newRating: number,
  ) {
    const professional = await tx.professionalProfile.findUnique({
      where: { id: professionalProfileId },
      select: {
        ratingAvg: true,
        ratingCount: true,
      },
    });

    const currentAvg = professional?.ratingAvg ?? 0;
    const currentCount = professional?.ratingCount ?? 0;

    const newCount = currentCount + 1;

    const newAvg =
      (currentAvg * currentCount + newRating) / newCount;

    await tx.professionalProfile.update({
      where: { id: professionalProfileId },
      data: {
        ratingAvg: newAvg,
        ratingCount: newCount,
      },
    });
  }
}