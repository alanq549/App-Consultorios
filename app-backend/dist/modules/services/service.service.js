"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceService = void 0;
// src/modules/service/service.service.ts
const prisma_1 = __importDefault(require("../../core/prisma"));
class ServiceService {
    /// funcion para validar la especialidad del profesional
    static async ensureProfessionalHasSpecialty(profileId, specialtyId) {
        const hasSpecialty = await prisma_1.default.professionalSpecialty.findFirst({
            where: {
                professionalId: profileId,
                specialtyId,
                status: "APPROVED",
            },
        });
        if (!hasSpecialty) {
            throw new Error("El profesional no tiene esta especialidad");
        }
    }
    static async ensureUniqueServiceName(profileId, name, excludeId) {
        const existing = await prisma_1.default.service.findFirst({
            where: {
                profileId,
                name,
                isActive: true,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
        });
        if (existing) {
            throw new Error("Ya existe un servicio con ese nombre");
        }
    }
    // Validaciones de negocio comunes para create/update
    static validateBusinessRules(data) {
        if (data.durationMin !== undefined) {
            if (data.durationMin <= 0) {
                throw new Error("La duración debe ser mayor a 0");
            }
            if (data.durationMin % 15 !== 0) {
                throw new Error("La duración debe ser múltiplo de 15 minutos");
            }
        }
        if (data.price !== undefined) {
            if (Number(data.price) <= 0) {
                throw new Error("El precio debe ser mayor a 0");
            }
        }
    }
    static async getProfileIdByUser(userId) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!profile) {
            throw new Error("Perfil profesional no existe");
        }
        return profile.id;
    }
    // listar servicios activos de un profesional
    static async findByProfessional(profileId) {
        return prisma_1.default.service.findMany({
            where: { profileId, isActive: true },
            orderBy: { createdAt: "asc" },
            include: { specialty: true },
        });
    }
    // crear servicio para un professional logeado
    static async create(profileId, data) {
        this.validateBusinessRules(data);
        await this.ensureUniqueServiceName(profileId, data.name);
        await this.ensureProfessionalHasSpecialty(profileId, data.specialtyId);
        return prisma_1.default.service.create({
            data: {
                ...data,
                profileId,
            },
            include: { specialty: true },
        });
    }
    // actualizar servicio (solo por su dueño)
    static async update(id, profileId, data) {
        this.validateBusinessRules(data);
        const service = await prisma_1.default.service.findFirst({
            where: { id, profileId },
        });
        if (!service) {
            throw new Error("No autorizado o no existe");
        }
        if (data.name && data.name !== service.name) {
            await this.ensureUniqueServiceName(profileId, data.name, id);
        }
        if (data.specialtyId && data.specialtyId !== service.specialtyId) {
            await this.ensureProfessionalHasSpecialty(profileId, data.specialtyId);
        }
        return prisma_1.default.service.update({
            where: { id },
            data,
            include: { specialty: true },
        });
    }
    // desactivar servicio (solo por su dueño)
    static async remove(id, profileId) {
        const service = await prisma_1.default.service.findFirst({
            where: { id, profileId },
        });
        if (!service) {
            throw new Error("No autorizado o no existe");
        }
        // 🔥 Regla importante
        const futureAppointments = await prisma_1.default.appointment.count({
            where: {
                serviceId: id,
                date: { gte: new Date() },
                status: { not: "CANCELLED" },
            },
        });
        if (futureAppointments > 0) {
            throw new Error("No puedes desactivar un servicio con citas futuras agendadas");
        }
        return prisma_1.default.service.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
exports.ServiceService = ServiceService;
