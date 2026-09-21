"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminProfileService = void 0;
// src/modules/users/adminprofile/adminprofile.service.ts
const prisma_1 = __importDefault(require("../../../core/prisma"));
class AdminProfileService {
    static async findByUserId(userId) {
        return prisma_1.default.adminProfile.findUnique({
            where: { userId },
        });
    }
    static async me(userId) {
        const profile = await prisma_1.default.adminProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new Error("Perfil admin no existe");
        return profile;
    }
    static async updateProfile(userId, data) {
        return prisma_1.default.adminProfile.update({
            where: { userId },
            data,
        });
    }
}
exports.AdminProfileService = AdminProfileService;
