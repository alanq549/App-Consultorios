"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigResponseDTO = exports.UpdateConfigDTO = void 0;
// src/modules/config/config.dto.ts
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
/**
 * Configuración editable del usuario
 * PUT /config/me
 */
exports.UpdateConfigDTO = zod_1.z.object({
    language: zod_1.z.nativeEnum(client_1.Language).optional(),
    theme: zod_1.z.nativeEnum(client_1.Theme).optional(),
    layout: zod_1.z.nativeEnum(client_1.LayoutType).optional(),
    notificationsEnabled: zod_1.z.boolean().optional(),
    // libre para el futuro (ej: tamaños, colores, accesibilidad)
    preferences: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.ConfigResponseDTO = zod_1.z.object({
    id: zod_1.z.number(),
    userId: zod_1.z.number(),
    language: zod_1.z.nativeEnum(client_1.Language),
    theme: zod_1.z.nativeEnum(client_1.Theme),
    layout: zod_1.z.nativeEnum(client_1.LayoutType),
    notificationsEnabled: zod_1.z.boolean(),
    preferences: zod_1.z.any().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
