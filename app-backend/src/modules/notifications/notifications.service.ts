// notifications.service.ts

import prisma from "@/core/prisma";
import { NotificationType } from "@prisma/client";

export class NotificationService {

  static async createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    appointmentId?: number
  ) {
    return prisma.notification.create({
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
  static async notifyWelcome(userId: number) {
    return this.createNotification(
      userId,
      NotificationType.WELCOME,
      "Bienvenido!",
      "Gracias por unirte a nuestra plataforma"
    );
  }

  // Nueva cita
  static async notifyAppointmentCreated(
    clientId: number,
    professionalId: number,
    appointmentId: number
  ) {
    await this.createNotification(
      clientId,
      NotificationType.APPOINTMENT_CREATED,
      "Cita creada",
      "Tu cita ha sido registrada",
      appointmentId
    );

    await this.createNotification(
      professionalId,
      NotificationType.APPOINTMENT_CREATED,
      "Nueva cita",
      "Tienes una nueva cita agendada",
      appointmentId
    );
  }

  // Cambio de estado
  static async notifyAppointmentStatus(
    userId: number,
    appointmentId: number,
    status: string
  ) {
    return this.createNotification(
      userId,
      NotificationType.APPOINTMENT_STATUS_CHANGED,
      "Estado de cita actualizado",
      `Tu cita ahora está ${status}`,
      appointmentId
    );
  }

  // Review
  static async notifyReviewRequest(
    clientId: number,
    appointmentId: number
  ) {
    return this.createNotification(
      clientId,
      NotificationType.REVIEW_REQUEST,
      "Deja tu review",
      "Tu cita terminó, cuéntanos cómo fue",
      appointmentId
    );
  }

  static async notifyAppointmentConfirmed(
    clientUserId: number,
    professionalUserId: number,
    appointmentId: number
  ) {
    await this.createNotification(
      clientUserId,
      NotificationType.APPOINTMENT_CONFIRMED,
      "Cita confirmada",
      "Tu cita ha sido confirmada por el profesional",
      appointmentId
    );

    await this.createNotification(
      professionalUserId,
      NotificationType.APPOINTMENT_CONFIRMED,
      "Cita confirmada",
      "Has confirmado la cita exitosamente",
      appointmentId
    );
  }

  static async notifyAppointmentCancelled(
    clientUserId: number,
    professionalUserId: number,
    appointmentId: number,
    cancelledBy: "SYSTEM" | "PROFESSIONAL"
  ) {
    const reason =
      cancelledBy === "SYSTEM"
        ? "La cita fue cancelada automáticamente por no confirmarse a tiempo"
        : "La cita fue cancelada por el profesional";

    await this.createNotification(
      clientUserId,
      NotificationType.APPOINTMENT_CANCELLED,
      "Cita cancelada",
      reason,
      appointmentId
    );

    await this.createNotification(
      professionalUserId,
      NotificationType.APPOINTMENT_CANCELLED,
      "Cita cancelada",
      "La cita fue cancelada correctamente",
      appointmentId
    );
  }

  static async notifyAppointmentCompleted(
    clientUserId: number,
    professionalUserId: number,
    appointmentId: number
  ) {
    await this.createNotification(
      clientUserId,
      NotificationType.APPOINTMENT_COMPLETED,
      "Cita completada",
      "Tu cita ha finalizado. Déjanos tu opinión.",
      appointmentId
    );

    await this.createNotification(
      professionalUserId,
      NotificationType.APPOINTMENT_COMPLETED,
      "La cita fue marcada como completada",
      "La cita fue marcada como completada",
      appointmentId
    );
  }

  // Obtener notificaciones
  static async getUserNotifications(userId: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async markAsRead(notificationId: number) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}