/// ARCHIVO: src/modules/catalog/infrastructure/adapters/notifications-service.adapter.ts
/// Adaptador de notificaciones de Catalog que delega en NotificationService.

import { CatalogNotificationPort } from "../../application/ports/catalog-notification.port";
import { NotificationService } from "@/modules/notifications/notifications.service";

export class NotificationsServiceAdapter implements CatalogNotificationPort {
  async notifySpecialtyRequested(professionalId: number): Promise<void> {
    await NotificationService.notifySpecialtyRequested(professionalId);
  }

  async notifySpecialtyApproved(professionalId: number): Promise<void> {
    await NotificationService.notifySpecialtyApproved(professionalId);
  }

  async notifySpecialtyRejected(professionalId: number): Promise<void> {
    await NotificationService.notifySpecialtyRejected(professionalId);
  }

  async notifyProfileSuspended(professionalId: number): Promise<void> {
    await NotificationService.notifyProfileSuspended(professionalId);
  }
}

