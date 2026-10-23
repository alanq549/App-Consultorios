/// ARCHIVO: src/modules/profiles/affiliations/application/ports/affiliation-repository.ts
/// 
/// Propósito: Definir la interfaz (contrato) para la persistencia de afiliaciones en la base de datos.
/// 
/// ¿Qué es y para qué sirve?
/// Es el puerto que define cómo interactuar con el almacenamiento de afiliaciones. 
/// Garantiza dos principios clave de la arquitectura:
/// 1. Tenant Scope obligatorio: Todas las búsquedas requieren `tenantId` para evitar fuga de datos entre sedes.
/// 2. Control de Concurrencia (Compare-and-Set): Previene condiciones de carrera al actualizar estados.

import {
  AffiliationStatus,
} from "../../domain/affiliation-types";

/**
 * Representa la estructura de una afiliación almacenada en la base de datos.
 */
export interface AffiliationRecord {
  /** Identificador único de la afiliación */
  id: number;
  /** Identificador del perfil profesional asociado */
  professionalProfileId: number;
  /** Identificador de la sede o consultorio (Tenant) dueño de la afiliación */
  tenantId: number;
  /** Estado actual de la afiliación en el ciclo de vida */
  status: AffiliationStatus;
  /** Fecha y hora de creación */
  createdAt: Date;
  /** Fecha y hora de la última modificación */
  updatedAt: Date;
}

/**
 * Resultado discriminado para operaciones de actualización condicional (Compare-and-Set).
 * 
 * Permite a la capa de aplicación saber exactamente si la actualización tuvo éxito o si falló
 * por no encontrar el registro (`NOT_FOUND`) o porque otra petición cambió el estado antes (`STALE`).
 */
export type ConditionalUpdateResult<T> =
  | {
    /** Indica que el registro fue actualizado exitosamente */
    updated: true;
    /** El registro actualizado con sus nuevos valores */
    record: T;
  }
  | {
    /** Indica que el registro no se pudo actualizar */
    updated: false;
    /**
     * Razón del fallo (opcional para compatibilidad con pruebas):
     * - NOT_FOUND: La afiliación no existe o no pertenece al tenant indicado.
     * - STALE: El estado actual en base de datos ya no coincide con el estado esperado (`expectedStatus`).
     */
    reason?: "NOT_FOUND" | "STALE";
    /** Optional record field for compatibility with tests */
    record?: null;
  };

/**
 * Contrato de persistencia para administrar el registro principal de afiliaciones.
 */
export interface AffiliationRepository {
  /**
   * Busca una afiliación por su ID garantizando el aislamiento por Tenant Scope.
   * 
   * @param tenantId - ID de la sede o consultorio obligatoria.
   * @param affiliationId - ID de la afiliación.
   * @returns La afiliación encontrada o `null` si no pertenece al tenant o no existe.
   */
  findById(
    tenantId: number,
    affiliationId: number,
  ): Promise<AffiliationRecord | null>;

  /**
   * Busca si ya existe una afiliación previa entre un profesional y un tenant específico.
   */
  findByProfessionalProfileAndTenant(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<AffiliationRecord | null>;

  /**
   * Lista todas las afiliaciones de un tenant, con filtro opcional por estado.
   */
  findByTenant(
    tenantId: number,
    filter?: { status?: AffiliationStatus },
  ): Promise<AffiliationRecord[]>;

  /**
   * Lista todas las afiliaciones de un perfil profesional across tenants.
   */
  findByProfessionalProfile(
    professionalProfileId: number,
  ): Promise<AffiliationRecord[]>;

  /**
   * Registra y crea una nueva afiliación en el sistema.
   */
  create(
    data: {
      professionalProfileId: number;
      tenantId: number;
      status: AffiliationStatus;
    },
  ): Promise<AffiliationRecord>;


  /**
 * Bloquea la afiliación dentro de la transacción actual
 * para serializar operaciones sobre sus revisiones.
 *
 * Devuelve false si la afiliación no existe dentro del tenant.
 */
  lockForRevisionWorkflow(
    tenantId: number,
    affiliationId: number,
  ): Promise<boolean>;

  /**
   * Actualiza el estado de una afiliación de forma atómica aplicando el patrón Compare-and-Set (CAS).
   * 
   * Solo realiza el cambio si la afiliación pertenece al `tenantId` indicado
   * Y su estado actual en la base de datos es exactamente igual a `expectedStatus`.
   * 
   * @param tenantId - ID de la sede.
   * @param affiliationId - ID de la afiliación a actualizar.
   * @param expectedStatus - Estado en el que la aplicación asume que está la afiliación antes de cambiarla.
   * @param nextStatus - Nuevo estado a asignar.
   * @returns Resultado indicando si se actualizó o la razón del fallo (`NOT_FOUND` o `STALE`).
   */
  updateStatusIfCurrent(
    tenantId: number,
    affiliationId: number,
    expectedStatus: AffiliationStatus,
    nextStatus: AffiliationStatus,
  ): Promise<ConditionalUpdateResult<AffiliationRecord>>;
}