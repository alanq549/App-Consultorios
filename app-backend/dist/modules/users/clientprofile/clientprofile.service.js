"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientProfileService = void 0;
// src/modules/users/clientprofile/clientprofile.service.ts
const prisma_1 = __importDefault(require("../../../core/prisma"));
const clientprofile_mapper_1 = require("./clientprofile.mapper");
class ClientProfileService {
    static async findByUserId(userId) {
        return prisma_1.default.clientProfile.findUnique({
            where: { userId },
        });
    }
    // obtener el perfil del cliente
    static async me(userId) {
        const profile = await prisma_1.default.clientProfile.findUnique({
            where: { userId },
            include: {
                _count: { select: { appointments: true } },
            },
        });
        if (!profile)
            throw new Error("Perfil de cliente no existe");
        return clientprofile_mapper_1.ClientProfileMapper.toResponse(profile);
    }
    // actualizar el perfil del cliente 
    static async updateProfile(userId, data) {
        const hasValidField = Object.values(data).some((v) => v !== undefined);
        if (!hasValidField) {
            throw new Error("No hay campos para actualizar");
        }
        const profile = await prisma_1.default.clientProfile.update({
            where: { userId },
            data,
            include: {
                _count: {
                    select: { appointments: true },
                },
            },
        });
        return clientprofile_mapper_1.ClientProfileMapper.toResponse(profile);
    }
}
exports.ClientProfileService = ClientProfileService;
