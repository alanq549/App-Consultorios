/// ARCHIVO: auth.middleware.ts
/// Protege las rutas verificando el token JWT y controlando los permisos por rol.

import { NextFunction, Request, Response } from "express";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/jwt-access-token-service";

const accessTokenService = new JwtAccessTokenService();

/// Middleware 1: Autenticación
/// Revisa que el cliente envíe un token válido y guarda los datos del usuario en `req.user`.
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Extrae el encabezado "Authorization: Bearer <token>"
  const authHeader = req.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // La validación y verificación JWT pertenecen a Identity.
    req.user = accessTokenService.verify(token);

    next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

/// Middleware 2: Autorización por Roles
/// Restringe el acceso a la ruta solo para los roles especificados.
export function authorizeRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Bloquea si la petición no pasó previamente por el authMiddleware
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // Bloquea si el rol del usuario no está en la lista de permisos permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    next();
  };
}