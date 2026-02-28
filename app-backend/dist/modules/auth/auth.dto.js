"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordDTO = exports.ForgotPasswordDTO = exports.VerifyCodeDTO = exports.LoginDTO = exports.RegisterDTO = void 0;
// src/modules/auth/auth.dto.ts
const zod_1 = require("zod");
exports.RegisterDTO = zod_1.z.discriminatedUnion("role", [
    // estos dos roles son los únicos permitidos para el registro público, por lo tanto admin ya no necesita validación extra
    // CLIENT
    zod_1.z.object({
        role: zod_1.z.literal("CLIENT"),
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8),
        profile: zod_1.z.object({
            name: zod_1.z.string(),
            lastName: zod_1.z.string().optional(),
            phone: zod_1.z.string().optional(),
        }),
    }),
    // PROFESSIONAL
    zod_1.z.object({
        role: zod_1.z.literal("PROFESSIONAL"),
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8),
        profile: zod_1.z.object({
            name: zod_1.z.string(),
            lastName: zod_1.z.string().optional(),
            phone: zod_1.z.string().optional(),
            specialtyId: zod_1.z.number(),
            description: zod_1.z.string().optional(),
        }),
    }),
]);
exports.LoginDTO = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.VerifyCodeDTO = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().length(6),
});
exports.ForgotPasswordDTO = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.ResetPasswordDTO = zod_1.z.object({
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(8),
});
