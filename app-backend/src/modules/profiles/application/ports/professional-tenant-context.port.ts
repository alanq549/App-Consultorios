/// ARCHIVO: src/modules/profiles/application/ports/professional-tenant-context.port.ts
/// Contrato público de Profiles que resuelve el contexto de escritura de un profesional en un
/// tenant (Fase 5 - Misión 4, D4).
///
/// Agrupa las tres condiciones que Catalog evalúa antes de mutar una oferta reservable: el estado
/// del perfil profesional, la membresía activa del usuario en el tenant y la afiliación activa del
/// profesional. Todas proceden de datos propiedad de Profiles, por eso se exponen desde aquí y no
/// se consultan desde Catalog.

import { TransactionContext } from "@/shared/types/transaction-context";

export interface ProfessionalTenantContext {
  /// `ProfessionalProfile.id`; `null` si el usuario no tiene perfil profesional.
  professionalProfileId: number | null;
  /// `ProfessionalProfile.verificationStatus === 'APPROVED'`.
  profileApproved: boolean;
  /// `TenantMembership` ACTIVE con tenant ACTIVE para (userId, tenantId).
  membershipActive: boolean;
  /// Afiliación ACTIVE del profesional en el tenant; `null` si no existe o no está activa.
  affiliationId: number | null;
}

export interface ProfessionalTenantContextContract {
  /**
   * Resuelve el contexto de escritura del profesional en un tenant.
   *
   * Acepta un `TransactionContext` opcional: cuando se provee, todas las lecturas se ejecutan
   * dentro de la unidad de trabajo para que la autorización sea coherente con la mutación.
   */
  resolve(params: {
    userId: number;
    tenantId: number;
    tx?: TransactionContext;
  }): Promise<ProfessionalTenantContext>;
}
