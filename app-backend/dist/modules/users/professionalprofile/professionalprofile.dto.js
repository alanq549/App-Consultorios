"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProfessionalProfileParamsSchema = void 0;
// src/modules/users/professionalprofile/professionalprofile.dto.ts
const zod_1 = require("zod");
exports.GetProfessionalProfileParamsSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, "ID inválido"),
});
