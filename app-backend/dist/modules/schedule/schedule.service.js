"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
// src/modules/schedule/schedule.service.ts
const prisma_1 = __importDefault(require("../../core/prisma"));
const SLOT_MINUTES = 15;
class ScheduleService {
    static validateTimeRules(startMin, endMin) {
        if (startMin >= endMin) {
            throw new Error("El horario de inicio debe ser menor que el de fin");
        }
        if (startMin < 0 || endMin > 1440) {
            throw new Error("Horario fuera de rango válido");
        }
        if (startMin % SLOT_MINUTES !== 0 || endMin % SLOT_MINUTES !== 0) {
            throw new Error("Los horarios deben ser múltiplos de 15 minutos");
        }
    }
    static async validateOverlap(profileId, dayOfWeek, startMin, endMin, excludeId) {
        const overlap = await prisma_1.default.schedule.findFirst({
            where: {
                profileId,
                dayOfWeek,
                isActive: true,
                NOT: excludeId ? { id: excludeId } : undefined,
                AND: [
                    { startMin: { lt: endMin } },
                    { endMin: { gt: startMin } },
                ],
            },
        });
        if (overlap) {
            throw new Error("El horario se solapa con otro existente");
        }
    }
    static async create(profileId, data) {
        this.validateTimeRules(data.startMin, data.endMin);
        await this.validateOverlap(profileId, data.dayOfWeek, data.startMin, data.endMin);
        return prisma_1.default.schedule.create({
            data: {
                ...data,
                profileId,
            },
        });
    }
    static async update(id, profileId, data) {
        const schedule = await prisma_1.default.schedule.findFirst({
            where: { id, profileId },
        });
        if (!schedule) {
            throw new Error("No autorizado o no existe");
        }
        const newStart = data.startMin ?? schedule.startMin;
        const newEnd = data.endMin ?? schedule.endMin;
        this.validateTimeRules(newStart, newEnd);
        await this.validateOverlap(profileId, schedule.dayOfWeek, newStart, newEnd, id);
        return prisma_1.default.schedule.update({
            where: { id },
            data,
        });
    }
    static async remove(id, profileId) {
        const schedule = await prisma_1.default.schedule.findFirst({
            where: { id, profileId },
        });
        if (!schedule) {
            throw new Error("No autorizado o no existe");
        }
        // 🔥 No eliminar si hay citas futuras dentro de ese rango
        const futureAppointments = await prisma_1.default.appointment.count({
            where: {
                professionalProfileId: profileId,
                date: { gte: new Date() },
                startMin: { gte: schedule.startMin },
                endMin: { lte: schedule.endMin },
                status: { not: "CANCELLED" },
            },
        });
        if (futureAppointments > 0) {
            throw new Error("No puedes eliminar un horario con citas futuras programadas");
        }
        return prisma_1.default.schedule.update({
            where: { id },
            data: { isActive: false },
        });
    }
    static async findByProfessional(profileId) {
        return prisma_1.default.schedule.findMany({
            where: { profileId, isActive: true },
            orderBy: { dayOfWeek: "asc" },
        });
    }
}
exports.ScheduleService = ScheduleService;
