"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const prisma_1 = __importDefault(require("../../core/prisma"));
const notifications_service_1 = require("../notifications/notifications.service");
class ReviewsService {
    static async create(userId, data) {
        const appointment = await prisma_1.default.appointment.findUnique({
            where: { id: data.appointmentId },
            include: { review: true },
        });
        if (!appointment)
            throw new Error("Appointment not found");
        const clientProfile = await prisma_1.default.clientProfile.findUnique({
            where: { userId },
        });
        if (!clientProfile)
            throw new Error("Client profile not found");
        if (appointment.clientProfileId !== clientProfile.id)
            throw new Error("Unauthorized");
        if (appointment.status !== "COMPLETED")
            throw new Error("Appointment not completed");
        if (appointment.review)
            throw new Error("Review already exists");
        const review = await prisma_1.default.$transaction(async (tx) => {
            const review = await tx.review.create({
                data: {
                    appointmentId: data.appointmentId,
                    rating: data.rating,
                    comment: data.comment,
                },
            });
            await this.updateProfessionalRating(tx, appointment.professionalProfileId, data.rating);
            return review;
        });
        // enviar notificación
        await notifications_service_1.NotificationService.notifyReview(appointment.professionalProfileId, appointment.id);
        return review;
    }
    static async getProfessionalReviews(professionalProfileId) {
        return prisma_1.default.review.findMany({
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
    static async getByAppointment(appointmentId) {
        return prisma_1.default.review.findUnique({
            where: { appointmentId },
        });
    }
    static async getByAppointments(appointmentIds) {
        return prisma_1.default.review.findMany({
            where: {
                appointmentId: {
                    in: appointmentIds,
                },
            },
        });
    }
    static async updateProfessionalRating(tx, professionalProfileId, newRating) {
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
        const newAvg = (currentAvg * currentCount + newRating) / newCount;
        await tx.professionalProfile.update({
            where: { id: professionalProfileId },
            data: {
                ratingAvg: newAvg,
                ratingCount: newCount,
            },
        });
    }
}
exports.ReviewsService = ReviewsService;
