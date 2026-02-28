// notifications.service.ts
import prisma from "@/core/prisma";
import { NotificationType } from "./notifications.types";

export class NotificationService {
  // Crear notificación genérica
  static async createNotification(
    userId: number,
    title: string,
    message: string,
    appointmentId?: number,
  ) {
    return prisma.notification.create({
      data: { userId, title, message, appointmentId, isRead: false },
    });
  }

  // Notificaciones de bienvenida al registrarse
  static async notifyWelcome(userId: number) {
    return this.createNotification(
      userId,
      "Bienvenido!",
      "Gracias por unirte a nuestra plataforma",
      undefined,
    );
  }

  // notificación para nueva cita (tanto para cliente como profesional)
  static async notifyAppointmentCreated(
    clientId: number,
    professionalId: number,
    appointmentId: number,
  ) {
    await this.createNotification(
      clientId,
      "Cita creada",
      "Tu cita ha sido registrada",
      appointmentId,
    );
    await this.createNotification(
      professionalId,
      "Nueva cita",
      "Tienes una nueva cita agendada",
      appointmentId,
    );
  }

  // notificación para cambios de estado de la cita (ej: confirmada, cancelada)
  static async notifyAppointmentStatus(
    userId: number,
    appointmentId: number,
    status: string,
  ) {
    return this.createNotification(
      userId,
      "Estado de cita actualizado",
      `Tu cita ahora está ${status}`,
      appointmentId,
    );
  }

  // Notificación para solicitar review después de la cita
  static async notifyReviewRequest(clientId: number, appointmentId: number) {
    return this.createNotification(
      clientId,
      "Deja tu review",
      "Tu cita terminó, cuéntanos cómo fue",
      appointmentId,
    );
  }

  static async notifyAppointmentConfirmed(
    clientUserId: number,
    professionalUserId: number,
    appointmentId: number,
  ) {
    await this.createNotification(
      clientUserId,
      "Cita confirmada",
      "Tu cita ha sido confirmada por el profesional",
      appointmentId,
    );

    await this.createNotification(
      professionalUserId,
      "Cita confirmada",
      "Has confirmado la cita exitosamente",
      appointmentId,
    );
  }

  static async notifyAppointmentCancelled(
    clientUserId: number,
    professionalUserId: number,
    appointmentId: number,
    cancelledBy: "SYSTEM" | "PROFESSIONAL",
  ) {
    const reason =
      cancelledBy === "SYSTEM"
        ? "La cita fue cancelada automáticamente por no confirmarse a tiempo"
        : "La cita fue cancelada por el profesional";

    await this.createNotification(
      clientUserId,
      "Cita cancelada",
      reason,
      appointmentId,
    );

    await this.createNotification(
      professionalUserId,
      "Cita cancelada",
      "La cita fue cancelada correctamente",
      appointmentId,
    );
  }

  static async notifyAppointmentCompleted(
    clientUserId: number,
    professionalUserId: number,
    appointmentId: number,
  ) {
    await this.createNotification(
      clientUserId,
      "Cita completada",
      "Tu cita ha finalizado. Déjanos tu opinión.",
      appointmentId,
    );

    await this.createNotification(
      professionalUserId,
      "Cita completada",
      "La cita fue marcada como completada",
      appointmentId,
    );
  }

  // Consultar todas las notificaciones de un usuario
  static async getUserNotifications(userId: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // Marcar notificación como leída
  static async markAsRead(notificationId: number) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // Marcar todas como leídas
  static async markAllAsRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
