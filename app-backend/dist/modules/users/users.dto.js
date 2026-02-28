"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateConfigDTO = void 0;
const zod_1 = require("zod");
exports.UpdateConfigDTO = zod_1.z.object({
    theme: zod_1.z.enum(["LIGHT", "DARK"]).optional(),
    language: zod_1.z.enum(["ES", "EN"]).optional(),
    notificationsEnabled: zod_1.z.boolean().optional(),
});
