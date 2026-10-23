/// ARCHIVO: src/modules/profiles/affiliations/application/ports/affiliation-revision-repository.ts
/// 
/// Propósito: Definir la interfaz (contrato) para la persistencia de revisiones/propuestas de contenido de afiliaciones.
/// 
/// ¿Qué es y para qué sirve?
/// Es el puerto responsable de gestionar el almacenamiento de las versiones de contenido enviadas por profesionales.
/// Garantiza dos principios clave de la arquitectura:
/// 1. Tenant Scope obligatorio: Todas las consultas y operaciones requieren `tenantId` para evitar fuga de datos entre sedes.
/// 2. Control de Concurrencia (Compare-and-Set): Evita evaluaciones simultáneas en conflicto usando `updateStatusIfCurrent`.

import {
  AffiliationRevisionStatus,
  SocialLinkInput,
} from "../../domain/affiliation-types";

import {
  ConditionalUpdateResult,
} from "./affiliation-repository";

/**
 * Representa la estructura de una revisión de contenido guardada en la base de datos.
 */
export interface AffiliationRevisionRecord {
  /** Identificador único de la revisión */
  id: number;
  /** ID de la afiliación a la que pertenece esta propuesta */
  affiliationId: number;
  /** Número correlativo de la revisión (1, 2, 3...) */
  status: AffiliationRevisionStatus;
  /** Número de versión de la revisión */
  revisionNumber: number;
  /** Biografía o descripción propuesta */
  description: string;
  /** ID del usuario que envió la propuesta */
  submittedByUserId: number;
  /** Fecha y hora en que se envió la propuesta */
  submittedAt: Date;
  /** ID del usuario que evaluó la propuesta (null si está pendiente) */
  reviewedByUserId: number | null;
  /** Fecha y hora de la evaluación (null si está pendiente) */
  reviewedAt: Date | null;
  /** Observación o motivo explicativo en caso de rechazo */
  rejectionReason: string | null;
  /** Fecha de creación del registro */
  createdAt: Date;
  /** Enlaces a redes sociales incluidos en esta revisión */
  socialLinks: SocialLinkInput[];
}

/**
 * Contrato de persistencia para la gestión de revisiones de contenido.
 */
export interface AffiliationRevisionRepository {
  /**
   * Busca una propuesta de revisión por su ID garantizando el aislamiento por Tenant Scope.
   * 
   * @param tenantId - ID de la sede o consultorio obligatoria.
   * @param revisionId - ID de la revisión.
   * @returns La revisión encontrada o `null` si no pertenece al tenant o no existe.
   */
  findById(
    tenantId: number,
    revisionId: number,
  ): Promise<AffiliationRevisionRecord | null>;

  /**
   * Obtiene la propuesta de revisión más reciente asociada a una afiliación dentro de un tenant.
   * 
   * @param tenantId - ID de la sede o consultorio.
   * @param affiliationId - ID de la afiliación.
   */
  findLatestByAffiliationId(
    tenantId: number,
    affiliationId: number,
  ): Promise<AffiliationRevisionRecord | null>;

  /**
   * Lista todas las revisiones asociadas a una afiliación dentro de un tenant, ordenadas por número de revisión descendente.
   */
  findByAffiliationId(
    tenantId: number,
    affiliationId: number,
  ): Promise<AffiliationRevisionRecord[]>;

  /**
   * Registra y guarda una nueva propuesta de revisión vinculada al tenant correspondiente.
   */
  create(
    data: {
      tenantId: number;
      affiliationId: number;
      revisionNumber: number;
      description: string;
      submittedByUserId: number;
      socialLinks: SocialLinkInput[];
    },
  ): Promise<AffiliationRevisionRecord>;

  /**
   * Actualiza el estado de una propuesta de revisión de forma atómica (Compare-and-Set).
   * 
   * Solo aplica la actualización si la revisión pertenece al `tenantId` indicado 
   * Y su estado actual coincide exactamente con `expectedStatus`.
   * 
   * @param tenantId - ID de la sede.
   * @param revisionId - ID de la revisión.
   * @param expectedStatus - Estado en el que la aplicación asume que está la propuesta antes de cambiarla.
   * @param nextStatus - Nuevo estado de revisión a asignar.
   * @param data - Datos opcionales del revisor, fecha de evaluación y motivo de rechazo.
   * @returns Resultado indicando si se actualizó o la razón del fallo (`NOT_FOUND` o `STALE`).
   */
  updateStatusIfCurrent(
    tenantId: number,
    revisionId: number,
    expectedStatus: AffiliationRevisionStatus,
    nextStatus: AffiliationRevisionStatus,
    data?: {
      reviewedByUserId?: number;
      reviewedAt?: Date;
      rejectionReason?: string | null;
    },
  ): Promise<
    ConditionalUpdateResult<AffiliationRevisionRecord>
  >;
}