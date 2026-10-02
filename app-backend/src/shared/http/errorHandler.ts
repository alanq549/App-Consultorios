/// ARCHIVO: src/core/errors/errorHandler.ts
/// Middleware global de Express para capturar y formatear todos los errores del sistema.

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { MulterError } from "multer";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Maneja fallos de validación de esquemas Zod (datos enviados por el cliente)
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Datos inválidos",
      errors: err.issues,
    });
  }

  // Maneja errores de negocio conocidos creados con nuestra clase AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // Maneja registros duplicados en la base de datos desde Prisma (ej. email ya registrado)
  if (err?.code === "P2002") {
    return res.status(409).json({
      message: "Recurso duplicado",
    });
  }

  // Maneja fallos en la carga o procesamiento de archivos cargados con Multer
  if (err instanceof MulterError) {
    return res.status(400).json({
      message: "Error al subir archivo",
      error: err.message,
    });
  }

  // Registra en consola cualquier error inesperado o no controlado (bugs, caídas de BD)
  console.error("💥 ERROR:", err);

  // Respuesta genérica de seguridad para no exponer detalles internos al cliente
  return res.status(500).json({
    message: "Error interno del servidor",
  });
}