/// ARCHIVO: src/modules/tenancy/application/use-cases/resolve-public-tenant-use-case.ts
/// Caso de uso para resolver y validar la existencia pública de un tenant activo.
///
/// Propósito: Encapsula la lógica de negocio para la resolución de tenants en rutas públicas:
/// - Consulta la existencia de un tenant activo por su ID mediante el puerto correspondiente.
/// - Retorna los datos básicos del tenant si es válido y activo.
/// - Lanza una excepción de recurso no encontrado (404) si el tenant no existe o está inactivo.

import { AppError } from "@/shared/errors/AppError";
import type {
  PublicTenantRecord,
  PublicTenantRepository,
} from "@/modules/tenancy/application/ports/public-tenant-repository";

/// Mensaje de error retornado cuando el tenant público no existe o no está activo.
const PUBLIC_TENANT_NOT_FOUND_MESSAGE = "Directorio no disponible";

/**
 * Caso de uso responsable de verificar la existencia y estado activo de un tenant para acceso público.
 */
export class ResolvePublicTenantUseCase {
  constructor(
    /// Inyección de dependencias del repositorio público de tenants.
    private readonly publicTenantRepository: PublicTenantRepository,
  ) {}

  /// Ejecuta la búsqueda y validación pública del tenant.
  /// 
  /// @param tenantId Identificador único del tenant a consultar.
  /// @returns Registro con la información pública del tenant.
  /// @throws {AppError} Lanza un error HTTP 404 si el tenant no existe o no está activo.
  async execute(tenantId: number): Promise<PublicTenantRecord> {
    const tenant =
      await this.publicTenantRepository.findActiveTenantById(tenantId);

    // Si el tenant no existe o no se encuentra activo, se deniega la resolución con 404.
    if (!tenant) {
      throw new AppError(PUBLIC_TENANT_NOT_FOUND_MESSAGE, 404, "PUBLIC_TENANT_NOT_FOUND");
    }

    return tenant;
  }
}