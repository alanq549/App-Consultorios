"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateServiceSchema = exports.CreateServiceSchema = void 0;
// src/modules/service/service.dto.ts
const zod_1 = require("zod");
const SLOT_MINUTES = 15;
exports.CreateServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    description: zod_1.z.string().min(5),
    durationMin: zod_1.z
        .number()
        .int()
        .positive()
        .refine((v) => v % SLOT_MINUTES === 0, { message: "durationMin debe ser múltiplo de 15" }),
    price: zod_1.z.number().positive(),
});
// DTO para actualizar servicio
exports.UpdateServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    description: zod_1.z.string().min(5).optional(),
    durationMin: zod_1.z
        .number()
        .int()
        .positive()
        .refine((v) => v % SLOT_MINUTES === 0, { message: "durationMin debe ser múltiplo de 15" }).optional(),
    price: zod_1.z.number().positive().optional(),
    isActive: zod_1.z.boolean().optional(),
});
