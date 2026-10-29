/// ARCHIVO: src/modules/profiles/affiliations/application/ports/affiliation-audit-repository.ts
/// Contrato (interfaz) y tipos para el registro e historial de auditoría de afiliaciones.
///
/// Propósito: Definir un puerto de almacenamiento de solo lectura/escritura incremental (append-only)
/// para registrar de forma inmutable los eventos, cambios de estado y acciones de los actores sobre las afiliaciones.

import type {
  AffiliationAuditAction,
  AffiliationStatus,
} from "../../domain/affiliation-types";

/**
 * Valores JSON válidos, independientes del mecanismo de persistencia.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/**
 * Estructura de datos requerida para registrar un nuevo evento en el historial de auditoría.
 */
export interface AffiliationAuditEventInput {
  /// ID del tenant donde ocurrió el evento de auditoría.
  tenantId: number;
  /// ID de la afiliación asociada al evento.
  affiliationId: number;
  /// Tipo de acción ejecutada (ej. solicitud, aprobación, rechazo, suspensión).
  action: AffiliationAuditAction;
  /// ID del usuario que realizó la acción o `null` si fue una acción del sistema.
  actorUserId: number | null;
  /// ID opcional de la revisión de contenido asociada al evento.
  revisionId?: number | null;

  /**
   * Estado de la afiliación previo al evento.
   * Representa el ciclo de vida de la afiliación, no el estado de las revisiones de contenido.
   */
  previousStatus?: AffiliationStatus | null;
  /**
   * Estado de la afiliación posterior al evento.
   */
  nextStatus?: AffiliationStatus | null;

  /// Motivo o justificación opcional proporcionada por el actor.
  reason?: string | null;

  /**
   * Campos que cambiaron durante la acción, representados como un objeto JSON.
   * Cada clave representa el nombre del campo y su valor es el nuevo valor asignado.
   * Se recomienda incluir solo los campos que efectivamente cambiaron.
   */
 changedFields?: JsonObject | null;

  /// Referencia opcional al origen del evento (ej. ID de ticket, webhook o tarea programada).
  sourceReference?: string | null;
  /// Fecha y hora exacta en la que ocurrió la acción (por defecto la fecha actual si se omite).
  occurredAt?: Date;
}

/**
 * Representación inmutable de un evento de auditoría una vez persistido en la base de datos.
 */
export interface AffiliationAuditEventRecord
  extends AffiliationAuditEventInput {
  /// Identificador único asignado al registro de auditoría.
  id: number;
  /// Fecha y hora de creación del registro en el sistema.
  createdAt: Date;
}

/**
 * Puerto de persistencia estrictamente incremental (append-only) para la trazabilidad de auditoría.
 *
 * La implementación inyectada dentro del Unit of Work debe utilizar la misma transacción de base de datos
 * que los demás repositorios para garantizar consistencia atómica.
 */
export interface AffiliationAuditRepository {
  /// Inserta un nuevo registro de auditoría en la base de datos.
  /// 
  /// @param input Datos e información contextual del evento a auditar.
  /// @returns Registro persistido con su ID y fecha de creación generadas.
  append(
    input: AffiliationAuditEventInput,
  ): Promise<AffiliationAuditEventRecord>;

  /// Obtiene los eventos de auditoría de una afiliación en orden cronológico.
  findByAffiliation(
    tenantId: number,
    affiliationId: number,
  ): Promise<AffiliationAuditEventRecord[]>;

  /// Obtiene un evento de auditoría puntual garantizando el aislamiento por tenant.
  ///
  /// Se requiere `tenantId` explícito: un evento de otro tenant se trata como no encontrado.
  ///
  /// @param tenantId ID del tenant propietario del evento.
  /// @param auditEventId ID del evento de auditoría.
  /// @returns El evento encontrado o `null` si no existe en ese tenant.
  findById(
    tenantId: number,
    auditEventId: number,
  ): Promise<AffiliationAuditEventRecord | null>;
}