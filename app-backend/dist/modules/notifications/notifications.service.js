"use strict";
// notifications.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_1 = __importDefault(require("../../core/prisma"));
const client_1 = require("@prisma/client");
class NotificationService {
    static async createNotification(userId, type, title, message, appointmentId) {
        return prisma_1.default.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                appointmentId,
                isRead: false,
            },
        });
    }
    // Bienvenida
    static async notifyWelcome(userId) {
        return this.createNotification(userId, client_1.NotificationType.WELCOME, "Bienvenido!", "Gracias por unirte a nuestra plataforma");
    }
    // Nueva cita
    static async notifyAppointmentCreated(clientId, professionalId, appointmentId) {
        await this.createNotification(clientId, client_1.NotificationType.APPOINTMENT_CREATED, "Cita creada", "Tu cita ha sido registrada", appointmentId);
        await this.createNotification(professionalId, client_1.NotificationType.APPOINTMENT_CREATED, "Nueva cita", "Tienes una nueva cita agendada", appointmentId);
    }
    // Cambio de estado
    static async notifyAppointmentStatus(userId, appointmentId, status) {
        return this.createNotification(userId, client_1.NotificationType.APPOINTMENT_STATUS_CHANGED, "Estado de cita actualizado", `Tu cita ahora está ${status}`, appointmentId);
    }
    // Review
    static async notifyReviewRequest(clientId, appointmentId) {
        return this.createNotification(clientId, client_1.NotificationType.REVIEW_REQUEST, "Deja tu review", "Tu cita terminó, cuéntanos cómo fue", appointmentId);
    }
    static async notifyReview(professionalId, appointmentId) {
        return this.createNotification(professionalId, client_1.NotificationType.REVIEW_REQUEST, "¡Te dejaron una reseña!", "Un cliente valoró tu servicio.", appointmentId);
    }
    static async notifyAppointmentConfirmed(clientUserId, professionalUserId, appointmentId) {
        await this.createNotification(clientUserId, client_1.NotificationType.APPOINTMENT_CONFIRMED, "Cita confirmada", "Tu cita ha sido confirmada por el profesional", appointmentId);
        await this.createNotification(professionalUserId, client_1.NotificationType.APPOINTMENT_CONFIRMED, "Cita confirmada", "Has confirmado la cita exitosamente", appointmentId);
    }
    static async notifyAppointmentCancelled(clientUserId, professionalUserId, appointmentId, cancelledBy) {
        const reason = cancelledBy === "SYSTEM"
            ? "La cita fue cancelada automáticamente por no confirmarse a tiempo"
            : "La cita fue cancelada por el profesional";
        await this.createNotification(clientUserId, client_1.NotificationType.APPOINTMENT_CANCELLED, "Cita cancelada", reason, appointmentId);
        await this.createNotification(professionalUserId, client_1.NotificationType.APPOINTMENT_CANCELLED, "Cita cancelada", "La cita fue cancelada correctamente", appointmentId);
    }
    static async notifyAppointmentCompleted(clientUserId, professionalUserId, appointmentId) {
        await this.createNotification(clientUserId, client_1.NotificationType.APPOINTMENT_COMPLETED, "Cita completada", "Tu cita ha finalizado. Déjanos tu opinión.", appointmentId);
        await this.createNotification(professionalUserId, client_1.NotificationType.APPOINTMENT_COMPLETED, "La cita fue marcada como completada", "La cita fue marcada como completada", appointmentId);
    }
    /// notificaciones para el status del perfil professional
    static async notifyProfileSubmitted(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Perfil enviado", "Tu perfil profesional está siendo revisado por el equipo");
    }
    static async notifyProfileApproved(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Perfil aprobado", "Tu perfil profesional ha sido aprobado. Ya puedes recibir citas.");
    }
    static async notifyProfileRejected(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Perfil rechazado", "Tu perfil fue rechazado. Revisa la información y vuelve a enviarlo.");
    }
    static async notifyProfileSuspended(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Perfil suspendido", "Tu perfil ha sido suspendido. Contacta con el equipo de soporte para más información.");
    }
    static async notifySpecialtyRequested(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Solicitud de especialidad enviada", "Tu solicitud de especialidad ha sido enviada. Será revisada por el equipo.");
    }
    static async notifySpecialtyApproved(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Especialidad aprobada", "Tu especialidad ha sido aprobada. Ya puedes ofrecerla.");
    }
    static async notifySpecialtyRejected(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Especialidad rechazada", "Tu especialidad fue rechazada. Revisa la información y vuelve a enviarla.");
    }
    static async notifySpecialtySuspended(userId) {
        return this.createNotification(userId, client_1.NotificationType.SYSTEM, "Especialidad suspendida", "Tu especialidad ha sido suspendida. Contacta con el equipo de soporte para más información.");
    }
    // Obtener notificaciones
    static async getUserNotifications(userId) {
        return prisma_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    static async markAsRead(notificationId) {
        return prisma_1.default.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
    static async markAllAsRead(userId) {
        return prisma_1.default.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}
exports.NotificationService = NotificationService;
