"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateScheduleSchema = exports.CreateScheduleSchema = void 0;
// src/modules/schedule/schedule.dto.ts
const zod_1 = require("zod");
const SLOT_MINUTES = 15;
exports.CreateScheduleSchema = zod_1.z
    .object({
    dayOfWeek: zod_1.z.number().int().min(0).max(6),
    startMin: zod_1.z.number().int().min(0),
    endMin: zod_1.z.number().int().min(0),
})
    .refine((data) => data.startMin % SLOT_MINUTES === 0, { message: "startMin debe ser múltiplo de 15" })
    .refine((data) => data.endMin % SLOT_MINUTES === 0, { message: "endMin debe ser múltiplo de 15" })
    .refine((data) => data.endMin > data.startMin, { message: "endMin debe ser mayor que startMin" });
exports.UpdateScheduleSchema = zod_1.z.object({
    startMin: zod_1.z.number().int().optional(),
    endMin: zod_1.z.number().int().optional(),
    isActive: zod_1.z.boolean().optional(),
});
