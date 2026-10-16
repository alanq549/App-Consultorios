/// ARCHIVO: src/modules/tenancy/http/resolve-public-tenant.middleware.ts
/// Middleware de Express para resolver y validar el tenant activo en rutas públicas.
///
/// Propósito: Interceptar peticiones en endpoints públicos que requieren contexto de tenant:
/// - Extrae y valida la cabecera HTTP `X-Tenant-ID`.
/// - Ejecuta el caso de uso `ResolvePublicTenantUseCase` para confirmar que el tenant exista y esté activo.
/// - Almacena el ID del tenant validado en `res.locals.tenantId` para consumo de posteriores handlers.
/// - Propaga errores HTTP (400 si la cabecera es inválida, 404 si el tenant no existe) mediante `next(error)`.

import type { NextFunction, Request, Response, RequestHandler } from "express";
import { AppError } from "@/shared/errors/AppError";
import { ResolvePublicTenantUseCase } from "@/modules/tenancy/application/use-cases/resolve-public-tenant-use-case";
import { PrismaPublicTenantRepository } from "@/modules/tenancy/infrastructure/prisma/prisma-public-tenant-repository";
import {
  TENANT_SELECTOR_HEADER,
  parseTenantId,
} from "@/modules/tenancy/http/tenancy.dto";

// Inicialización de la infraestructura y caso de uso para resolución pública (singleton a nivel de módulo).
const publicTenantRepository = new PrismaPublicTenantRepository();
const resolvePublicTenantUseCase = new ResolvePublicTenantUseCase(
  publicTenantRepository,
);

/**
 * Middleware para validar el header de selección de tenant en solicitudes públicas sin requerir autenticación de usuario.
 */

export function resolvePublicTenantMiddleware(
  onTenantNotFound?: RequestHandler,
): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const tenantId = parseTenantId(req.get(TENANT_SELECTOR_HEADER));

    if (tenantId === null) {
      next(new AppError("Invalid tenant selector", 400));
      return;
    }

    try {
      const tenant = await resolvePublicTenantUseCase.execute(tenantId);
      res.locals.tenantId = tenant.id;
      next();
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === "PUBLIC_TENANT_NOT_FOUND" &&
        onTenantNotFound
      ) {
        onTenantNotFound(req, res, next);
        return;
      }

      next(error);
    }
  };
}
