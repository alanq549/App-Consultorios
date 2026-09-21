"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProfileDTO = exports.UpdateAvatarDTO = exports.ChangePasswordDTO = exports.ChangeEmailDTO = void 0;
// src/modules/users/users.dto.ts
const zod_1 = require("zod");
exports.ChangeEmailDTO = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
exports.ChangePasswordDTO = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(6),
});
exports.UpdateAvatarDTO = zod_1.z.object({
    avatar: zod_1.z.string().url(),
});
exports.UpdateProfileDTO = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    lastName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    description: zod_1.z.string().optional()
});
