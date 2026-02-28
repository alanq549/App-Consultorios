"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
// src/modules/config/config.service.ts
const prisma_1 = __importDefault(require("@/core/prisma"));
class ConfigService {
    static async getByUser(userId) {
        const config = await prisma_1.default.customConfig.findUnique({
            where: { userId },
            // filtramos y devolvemos solo los campos necesarios
            select: {
                id: true,
                userId: true,
                language: true,
                theme: true,
                layout: true,
                preferences: true,
                notificationsEnabled: true,
                //  createdAt y updatedAt  no se incluyen
            },
        });
        // si no se encuentra la configuracion, lanzamos un error
        if (!config) {
            throw new Error("Configuración no encontrada");
        }
        // devolvemos la configuracion encontrda
        return config;
    }
    // actualizacion de la configuracion del usuario
    static async update(userId, data) {
        const config = await prisma_1.default.customConfig.update({
            where: { userId },
            data,
        });
        return config;
    }
}
exports.ConfigService = ConfigService;
