/// ARCHIVO: src/modules/catalog/application/ports/offer-write-context.port.ts
/// Puerto de autorización de escritura de ofertas (D4).
/// Catalog delega en Profiles la resolución del estado del perfil, la membresía del usuario en el
/// tenant y la afiliación activa, sin conocer sus tablas.
///
/// Se resuelve todo el contexto en una sola llamada porque las tres condiciones proceden del mismo
/// agregado (Profiles) y deben evaluarse de forma coherente dentro de la misma unidad de trabajo.

import { TransactionContext } from "@/shared/types/transaction-context";

export interface OfferWriteContext {
  /// `ProfessionalProfile.id` del actor; `null` si el usuario no tiene perfil profesional (D4.1).
  professionalProfileId: number | null;
  /// `ProfessionalProfile.verificationStatus === 'APPROVED'` (D4.2).
  profileApproved: boolean;
  /// `TenantMembership.status === 'ACTIVE'` con tenant ACTIVE para (userId, tenantId) (D4.4).
  membershipActive: boolean;
  /// Afiliación ACTIVE del profesional en el tenant (D4.3); `null` si no existe o no está activa.
  affiliationId: number | null;
}

export interface OfferWriteContextPort {
  resolve(params: {
    userId: number;
    tenantId: number;
    tx?: TransactionContext;
  }): Promise<OfferWriteContext>;
}
