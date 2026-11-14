/// ARCHIVO: src/modules/catalog/application/ports/catalog-notification.port.ts
/// Puerto para emisión de notificaciones post-commit de Catalog.

export interface CatalogNotificationPort {
  notifySpecialtyRequested(professionalId: number): Promise<void>;
  notifySpecialtyApproved(professionalId: number): Promise<void>;
  notifySpecialtyRejected(professionalId: number): Promise<void>;
  notifyProfileSuspended(professionalId: number): Promise<void>;
}

