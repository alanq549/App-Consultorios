"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSpecialtySchema = exports.CreateSpecialtySchema = void 0;
///src/modules/specialty/specialty.dto.ts
const zod_1 = require("zod");
exports.CreateSpecialtySchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(100),
    description: zod_1.z.string().max(500).optional(),
});
exports.UpdateSpecialtySchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    isActive: zod_1.z.boolean().optional(),
});
