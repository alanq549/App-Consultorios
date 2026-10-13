/// ARCHIVO: src/modules/tenancy/application/use-cases/get-current-tenant-use-case.ts
/// Caso de uso para obtener y validar el contexto activo del tenant seleccionado por el usuario.
///
/// Propósito: Encapsula las reglas de negocio para permitir el acceso a un tenant:
/// - Recuperación de la membresía del usuario mediante el repositorio.
/// - Verificación del estado activo del tenant.
/// - Verificación del estado activo de la membresía del usuario.
/// - Lanzamiento de excepción de acceso denegado (403) si alguna condición falla.

import type {
  TenantContextRecord,
  TenantContextRepository,
} from "@/modules/tenancy/application/ports/tenant-context-repository";
import {TenantContextUnavailableError} from "@/modules/tenancy/domain/tenancy-errors"

/// Mensaje de error genérico cuando el contexto no existe o no cumple los criterios de acceso.
const TENANT_CONTEXT_UNAVAILABLE =
  "Tenant context unavailable or access denied";

/**
 * Caso de uso responsable de validar que un usuario tenga acceso válido y activo a un tenant.
 */
export class GetCurrentTenantUseCase {
  constructor(
    /// Inyección de dependencias del repositorio de contexto del tenant.
    private readonly tenantContextRepository: TenantContextRepository,
  ) {}

  /// Ejecuta la validación de acceso al tenant para el usuario indicado.
  /// 
  /// @throws {TenantContextUnavailableError} Lanza un error HTTP 403 si:
  /// - No se encuentra la relación usuario-tenant.
  /// - El tenant no está en estado "ACTIVE".
  /// - La membresía del usuario dentro del tenant no está en estado "ACTIVE".
  async execute(
    userId: number,
    tenantId: number,
  ): Promise<TenantContextRecord> {
    const context =
      await this.tenantContextRepository.findMembershipContext(
        userId,
        tenantId,
      );

    // Validación de reglas de negocio: tanto el tenant como la membresía deben estar activos.
    if (
      !context ||
      context.tenant.status !== "ACTIVE" ||
      context.membership.status !== "ACTIVE"
    ) {
      throw new TenantContextUnavailableError()
    }

    return context;
  }
}