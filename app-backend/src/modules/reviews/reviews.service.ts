import prisma from "@/core/prisma";
import { CreateReviewInput } from "./reviews.dto";
import { Prisma } from "@prisma/client";
import { NotificationService } from "../notifications/notifications.service";


export class ReviewsService {

  static async create(userId: number, data: CreateReviewInput) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId },
    include: { review: true },
  });

  if (!appointment) throw new Error("Appointment not found");

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId },
  });

  if (!clientProfile) throw new Error("Client profile not found");

  if (appointment.clientProfileId !== clientProfile.id)
    throw new Error("Unauthorized");

  if (appointment.status !== "COMPLETED")
    throw new Error("Appointment not completed");

  if (appointment.review) throw new Error("Review already exists");

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

  // enviar notificación
  await NotificationService.notifyReview(
    appointment.professionalProfileId,
    appointment.id
  );

  return review;
}

     static async getProfessionalReviews(professionalProfileId: number) {
        return prisma.review.findMany({
        where: {
            appointment: {
            professionalProfileId,
            },
        },
        include: {
            appointment: {
            include: {
                clientProfile: true,
            },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        });
    }

    static async getByAppointment(appointmentId: number) {
        return prisma.review.findUnique({
        where: { appointmentId },
        });
    }

    static async getByAppointments(appointmentIds: number[]) {
  return prisma.review.findMany({
    where: {
      appointmentId: {
        in: appointmentIds,
      },
    },
  });
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