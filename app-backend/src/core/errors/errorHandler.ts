import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 🧠 Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Datos inválidos",
      errors: err.issues,
    });
  }

  // 🎯 Errores controlados
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // 💣 Prisma
  if (err?.code === "P2002") {
    return res.status(409).json({
      message: "Recurso duplicado",
    });
  }

  // ☠️ Error inesperado
  console.error("💥 ERROR:", err);

  return res.status(500).json({
    message: "Error interno del servidor",
  });
}
