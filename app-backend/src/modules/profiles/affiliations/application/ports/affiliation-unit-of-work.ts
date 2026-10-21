/// ARCHIVO: src/modules/profiles/affiliations/application/ports/affiliation-unit-of-work.ts
/// Puerto de la capa de aplicación que abstrae el patrón Unit of Work (Unidad de Trabajo) para operaciones transaccionales.
///
/// Propósito: Definir un contrato atómico e inyectable que agrupa los repositorios del módulo de afiliaciones
/// bajo una misma transacción de base de datos. Garantiza consistencia ACID al ejecutar operaciones compuestas
/// (afiliación, revisiones y auditoría), asegurando que si alguna falla, todo se revierta (rollback) automáticamente.

import type { AffiliationRepository } from "./affiliation-repository";
import type { AffiliationRevisionRepository } from "./affiliation-revision-repository";
import type { AffiliationAuditRepository } from "./affiliation-audit-repository";
import type { ActiveMembershipChecker } from "./active-membership-checker";

/**
 * Conjunto de repositorios y verificadores del módulo de afiliaciones enlazados a un mismo contexto transaccional.
 *
 * La implementación de infraestructura debe garantizar que todas las operaciones
 * realizadas mediante estas instancias compartan la misma transacción activa.
 */
export interface AffiliationTransactionalRepositories {
  /// Repositorio para la gestión del ciclo de vida y estado de las afiliaciones.
  affiliations: AffiliationRepository;
  /// Repositorio para el manejo de versiones, ediciones y propuestas de contenido.
  revisions: AffiliationRevisionRepository;
  /// Repositorio para el registro de eventos y trazabilidad de auditoría.
  audit: AffiliationAuditRepository;
  /// Verificador de membresía activa coordinado dentro de la misma transacción.
  memberships: ActiveMembershipChecker;
}

/**
 * Puerto que permite ejecutar casos de uso de afiliaciones dentro de un límite transaccional atómico.
 */
export interface AffiliationUnitOfWork {
  /// Ejecuta un callback asíncrono proporcionándole acceso a los repositorios transaccionales.
  ///
  /// @template T - Tipo de dato que retorna la operación de negocio.
  /// @param work - Callback que recibe la agrupación de repositorios y ejecuta la lógica.
  /// @returns Promesa que resuelve al valor `T` si la transacción se confirma (`commit`) con éxito.
  /// @throws Propaga cualquier excepción producida dentro del callback, forzando un `rollback` de la transacción.
  execute<T>(
    work: (
      repositories: AffiliationTransactionalRepositories,
    ) => Promise<T>,
  ): Promise<T>;
}