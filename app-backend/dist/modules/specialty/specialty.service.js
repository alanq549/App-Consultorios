"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialtyService = void 0;
///src/modules/specialty/specialty.service.ts
const prisma_1 = __importDefault(require("../../core/prisma"));
class SpecialtyService {
    static async create(data) {
        const exists = await prisma_1.default.specialty.findUnique({
            where: { name: data.name },
        });
        if (exists && exists.isActive) {
            throw new Error("La especialidad ya existe");
        }
        if (exists && !exists.isActive) {
            return prisma_1.default.specialty.update({
                where: { id: exists.id },
                data: { ...data, isActive: true },
            });
        }
        return prisma_1.default.specialty.create({
            data,
        });
    }
    static async list() {
        return prisma_1.default.specialty.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
        });
    }
    static async list_soft_delete() {
        return prisma_1.default.specialty.findMany({
            where: { isActive: false },
            orderBy: { name: "asc" },
        });
    }
    static async listByProfessional(profileId) {
        return prisma_1.default.professionalSpecialty.findMany({
            where: {
                professionalId: profileId,
                specialty: {
                    isActive: true,
                },
            },
            include: {
                specialty: true,
            },
        });
    }
    static async update(id, data) {
        const specialty = await prisma_1.default.specialty.findUnique({
            where: { id },
        });
        if (!specialty) {
            throw new Error("Especialidad no encontrada");
        }
        return prisma_1.default.specialty.update({
            where: { id },
            data,
        });
    }
    static async restore(id) {
        return prisma_1.default.specialty.update({
            where: { id },
            data: { isActive: true },
        });
    }
    static async remove(id) {
        return prisma_1.default.specialty.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
exports.SpecialtyService = SpecialtyService;
