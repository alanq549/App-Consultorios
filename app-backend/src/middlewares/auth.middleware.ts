/// ARCHIVO: auth.middleware.ts
/// Protege las rutas verificando el token JWT y controlando los permisos por rol.

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

/// Clave secreta para firmar/validar tokens (definida en las variables de entorno).
const JWT_SECRET = process.env.JWT_SECRET!;

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
    // Decodifica y verifica que el token no haya sido alterado ni haya expirado
    const payload = jwt.verify(token, JWT_SECRET);

    // Valida que el ID del usuario dentro del token sea un número positivo válido
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "number" ||
      !Number.isInteger(payload.userId) ||
      payload.userId <= 0
    ) {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }

    // Valida que el rol del token pertenezca a los roles permitidos en la app
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "PROFESSIONAL" &&
      payload.role !== "CLIENT"
    ) {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }

    // Inyecta el usuario autenticado en la petición para usarlo en los siguientes middlewares/controladores
    req.user = {
      id: payload.userId,
      role: payload.role,
    };

    next(); // Continúa hacia la siguiente función
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

/// Middleware 2: Autorización por Roles
/// Restringe el acceso a la ruta solo para los roles especificados (ej. authorizeRole("ADMIN")).
/// posteriormente sería razonable tiparlo con ActorRole para evitar: ''' authorizeRole("LO_QUE_SEA")'''
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

    next(); // El usuario tiene permiso, continúa
  };
}