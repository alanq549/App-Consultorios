"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
// src/modules/schedule/schedule.service.ts
const prisma_1 = __importDefault(require("@/core/prisma"));
class ScheduleService {
    //crear horario 
    static async create(profileId, data) {
        return prisma_1.default.schedule.create({
            data: {
                ...data,
                profileId,
            },
        });
    }
    //obtener horarios activos de un profesional
    static async findByProfessional(profileId) {
        return prisma_1.default.schedule.findMany({
            where: {
                profileId,
                isActive: true,
            },
            orderBy: {
                dayOfWeek: "asc",
            },
        });
    }
    //actualizar horario
    static async update(id, data) {
        return prisma_1.default.schedule.update({
            where: { id },
            data,
        });
    }
    //eliminar horario (soft delete)
    static async remove(id) {
        return prisma_1.default.schedule.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
exports.ScheduleService = ScheduleService;
