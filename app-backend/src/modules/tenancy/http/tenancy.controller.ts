/// ARCHIVO: src/modules/tenancy/http/tenancy.controller.ts
/// Controlador HTTP para gestionar endpoints relacionados con el contexto del tenant.
///
/// Propósito: Recibir peticiones HTTP para obtener el contexto del tenant activo:
/// - Lectura y validación de la cabecera `X-Tenant-ID`.
/// - Verificación de la autenticación del usuario (`req.user`).
/// - Delegación de la lógica de negocio al caso de uso `GetCurrentTenantUseCase`.
/// - Manejo centralizado de respuestas HTTP (200, 400, 401) y propagación de errores mediante `next()`.

import { NextFunction, Request, Response } from "express";
import { GetCurrentTenantUseCase } from "@/modules/tenancy/application/use-cases/get-current-tenant-use-case";
import { PrismaTenantContextRepository } from "@/modules/tenancy/infrastructure/prisma/prisma-tenant-context-repository";
import {
  INVALID_TENANT_SELECTOR_MESSAGE,
  TENANT_SELECTOR_HEADER,
  parseTenantId,
} from "@/modules/tenancy/http/tenancy.dto";
import { TenantContextUnavailableError } from "@/modules/tenancy/domain/tenancy-errors";

// Inicialización de la infraestructura y caso de uso (singleton a nivel de módulo).
const tenantContextRepository = new PrismaTenantContextRepository();

const getCurrentTenantUseCase = new GetCurrentTenantUseCase(
  tenantContextRepository,
);

/**
 * Controlador que expone los endpoints HTTP del módulo de tenancy.
 */
export class TenancyController {
  /// Obtiene y retorna los datos del tenant y la membresía del usuario autenticado.
  /// 
  /// Respuestas HTTP:
  /// - 200 OK: Retorna `TenantContextRecord`.
  /// - 400 Bad Request: La cabecera `X-Tenant-ID` falta o no es un entero positivo válido.
  /// - 401 Unauthorized: El usuario no se encuentra autenticado en la petición.
  /// - 403 Forbidden / Errores de negocio: Propagados a Express a través de `next(error)`.
  static async getCurrent(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    // 1. Extrae y valida el ID del tenant enviado en el encabezado HTTP.
    const tenantId = parseTenantId(req.get(TENANT_SELECTOR_HEADER));

    if (tenantId === null) {
      return res.status(400).json({
        message: INVALID_TENANT_SELECTOR_MESSAGE,
      });
    }

    // 2. Comprueba que el usuario haya sido autenticado previamente por un middleware.
    if (!req.user) {
      return res.status(401).json({
        message: "No autenticado",
      });
    }

    try {
      // 3. Ejecuta el caso de uso para recuperar y validar el contexto activo.
      const context = await getCurrentTenantUseCase.execute(
        req.user.id,
        tenantId,
      );

      return res.status(200).json(context);
    } catch (error) {
      // 4. Manejo de errores de negocio específicos del módulo de tenancy.
      if (error instanceof TenantContextUnavailableError) {
        return res.status(403).json({
          message: error.message,
        });
      }
      // 5. Propagación de otros errores a la capa superior de Express para manejo global.
      return next(error);
    }
  }
}