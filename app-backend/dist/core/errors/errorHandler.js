"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const AppError_1 = require("./AppError");
const multer_1 = require("multer");
function errorHandler(err, req, res, next) {
    // 🧠 Zod
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: "Datos inválidos",
            errors: err.issues,
        });
    }
    // 🎯 Errores controlados
    if (err instanceof AppError_1.AppError) {
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
    // 📦 Multer
    if (err instanceof multer_1.MulterError) {
        return res.status(400).json({
            message: "Error al subir archivo",
            error: err.message,
        });
    }
    // ☠️ Error inesperado
    console.error("💥 ERROR:", err);
    return res.status(500).json({
        message: "Error interno del servidor",
    });
}
