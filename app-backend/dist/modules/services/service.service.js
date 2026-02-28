"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceService = void 0;
// src/modules/service/service.service.ts
const prisma_1 = __importDefault(require("@/core/prisma"));
class ServiceService {
    static async create(profileId, data) {
        return prisma_1.default.service.create({
            data: {
                ...data,
                profileId,
            },
        });
    }
    // encontrar servicios por perfil profesional
    static async findByProfessional(profileId) {
        return prisma_1.default.service.findMany({
            where: {
                profileId,
                isActive: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });
    }
    // encontrar servicio por ID
    static async findById(id) {
        return prisma_1.default.service.findUnique({
            where: { id },
        });
    }
    static async update(id, data) {
        return prisma_1.default.service.update({
            where: { id },
            data,
        });
    }
    static async remove(id) {
        // soft delete
        return prisma_1.default.service.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
exports.ServiceService = ServiceService;
