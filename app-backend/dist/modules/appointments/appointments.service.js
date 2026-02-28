"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentService = void 0;
// appointments.service.ts
const prisma_1 = __importDefault(require("@/core/prisma"));
const availability_util_1 = require("./availability.util");
class AppointmentService {
    //  Crear cita con toda la info lista para frontend
    static async create(clientProfileId, data) {
        const service = await this.getServiceById(data.serviceId, data.professionalProfileId);
        const endMin = data.startMin + service.durationMin;
        const appointmentDate = new Date(data.date + "T00:00:00Z");
        const now = new Date();
        const appointmentDateTime = new Date(appointmentDate);
        appointmentDateTime.setUTCMinutes(data.startMin);
        if (appointmentDateTime <= now) {
            throw new Error("No puedes crear citas en el pasado");
        }
        await this.validateSchedule(data.professionalProfileId, appointmentDate, data.startMin, endMin);
        await this.validateOverlap(data.professionalProfileId, appointmentDate, data.startMin, endMin);
        const appointment = await prisma_1.default.appointment.create({
            data: {
                clientProfileId,
                professionalProfileId: data.professionalProfileId,
                serviceId: data.serviceId,
                date: appointmentDate,
                startMin: data.startMin,
                endMin,
                notes: data.notes,
            },
            include: {
                service: true,
                professional: {
                    include: {
                        user: true,
                        specialty: true,
                    },
                },
                clientProfile: { include: { user: true } },
            },
        });
        //  Transformamos la respuesta para frontend
        return {
            id: appointment.id,
            date: appointment.date.toISOString(),
            startMin: appointment.startMin,
            endMin: appointment.endMin,
            notes: appointment.notes,
            status: appointment.status,
            service: {
                id: appointment.service.id,
                name: appointment.service.name,
                description: appointment.service.description,
                durationMin: appointment.service.durationMin,
                price: Number(appointment.service.price),
            },
            professional: {
                id: appointment.professional.id,
                name: appointment.professional.name,
                lastName: appointment.professional.lastName,
                phone: appointment.professional.phone,
                avatar: appointment.professional.avatar,
                specialty: appointment.professional.specialty
                    ? {
                        id: appointment.professional.specialty.id,
                        name: appointment.professional.specialty.name,
                    }
                    : null,
                user: {
                    id: appointment.professional.user.id,
                    email: appointment.professional.user.email,
                },
            },
            client: appointment.clientProfile
                ? {
                    id: appointment.clientProfile.id,
                    name: appointment.clientProfile.name,
                    lastName: appointment.clientProfile.lastName,
                    user: {
                        id: appointment.clientProfile.user.id,
                        email: appointment.clientProfile.user.email,
                    },
                }
                : null,
        };
    }
    // Crear cita para guest (sin user ni clientProfile) esto para clientes sin cuenta y ocacionales, estas las crean profesionales
    static async createGuest(professionalProfileId, data) {
        const service = await this.getServiceById(data.serviceId, data.professionalProfileId);
        const endMin = data.startMin + service.durationMin;
        const appointmentDate = new Date(data.date + "T00:00:00Z");
        const now = new Date();
        const appointmentDateTime = new Date(appointmentDate);
        appointmentDateTime.setUTCMinutes(data.startMin);
        if (appointmentDateTime <= now) {
            throw new Error("No puedes crear citas en el pasado");
        }
        await this.validateSchedule(professionalProfileId, appointmentDate, data.startMin, endMin);
        await this.validateOverlap(professionalProfileId, appointmentDate, data.startMin, endMin);
        // Crear o buscar guest client
        let guest = await prisma_1.default.guestClient.findFirst({
            where: { email: data.guestEmail || undefined, name: data.guestName },
        });
        if (!guest) {
            guest = await prisma_1.default.guestClient.create({
                data: {
                    name: data.guestName,
                    email: data.guestEmail,
                    phone: data.guestPhone,
                },
            });
        }
        const appointment = await prisma_1.default.appointment.create({
            data: {
                guestId: guest.id,
                professionalProfileId,
                serviceId: data.serviceId,
                date: appointmentDate,
                startMin: data.startMin,
                endMin,
                notes: data.notes,
            },
            include: {
                service: true,
                professional: { include: { user: true, specialty: true } },
                guest: true,
            },
        });
        return {
            id: appointment.id,
            date: appointment.date.toISOString(),
            startMin: appointment.startMin,
            endMin: appointment.endMin,
            notes: appointment.notes,
            status: appointment.status,
            service: {
                id: appointment.service.id,
                name: appointment.service.name,
                description: appointment.service.description,
                durationMin: appointment.service.durationMin,
                price: Number(appointment.service.price),
            },
            professional: {
                id: appointment.professional.id,
                name: appointment.professional.name,
                lastName: appointment.professional.lastName,
                phone: appointment.professional.phone,
                avatar: appointment.professional.avatar,
                specialty: appointment.professional.specialty
                    ? {
                        id: appointment.professional.specialty.id,
                        name: appointment.professional.specialty.name,
                    }
                    : null,
                user: {
                    id: appointment.professional.user.id,
                    email: appointment.professional.user.email,
                },
            },
            client: appointment.guest
                ? {
                    id: appointment.guest.id,
                    name: appointment.guest.name,
                    lastName: null,
                    user: { id: 0, email: appointment.guest.email || "" }, // Front puede ignorar id de user
                }
                : null,
        };
    }
    // Obtener slots disponibles para un profesional, servicio y día específico
    static async getAvailability(professionalProfileId, serviceId, startOfDay, endOfDay) {
        const now = new Date();
        // Si el día ya pasó completamente
        if (endOfDay <= now) {
            return [];
        }
        const service = await this.getServiceById(serviceId, professionalProfileId);
        const jsDay = startOfDay.getUTCDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
        const schedules = await prisma_1.default.schedule.findMany({
            where: {
                profileId: professionalProfileId,
                dayOfWeek,
                isActive: true,
            },
            select: {
                startMin: true,
                endMin: true,
            },
        });
        const appointments = await prisma_1.default.appointment.findMany({
            where: {
                professionalProfileId,
                date: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
                status: { not: "CANCELLED" },
            },
            select: {
                startMin: true,
                endMin: true,
            },
        });
        const slots = (0, availability_util_1.generateAvailabilitySlots)({
            schedules,
            appointments,
            serviceDuration: service.durationMin,
        });
        // Si es hoy, eliminar horarios pasados
        const isToday = startOfDay <= now && endOfDay > now;
        if (isToday) {
            const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
            return slots.filter((slot) => slot.startMin > currentMinutes);
        }
        return slots;
    }
    // Obtener todas las citas de un usuario (cliente o profesional)
    static async getAppointmentsByUser(userId) {
        // Revisar si es cliente
        const clientProfile = await prisma_1.default.clientProfile.findUnique({
            where: { userId },
        });
        const professionalProfile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
        const where = {};
        if (clientProfile) {
            where.OR = [{ clientProfileId: clientProfile.id }];
        }
        if (professionalProfile) {
            where.OR = where.OR
                ? [...where.OR, { professionalProfileId: professionalProfile.id }]
                : [{ professionalProfileId: professionalProfile.id }];
        }
        if (!where.OR)
            return []; // usuario sin citas
        const appointments = await prisma_1.default.appointment.findMany({
            where,
            include: {
                service: true,
                professional: { include: { user: true, specialty: true } },
                clientProfile: { include: { user: true } },
                guest: true,
            },
            orderBy: { date: "desc" },
        });
        return appointments.map((appt) => ({
            id: appt.id,
            date: appt.date.toISOString().split("T")[0],
            startMin: appt.startMin,
            endMin: appt.endMin,
            notes: appt.notes,
            status: appt.status,
            service: {
                id: appt.service.id,
                name: appt.service.name,
                description: appt.service.description,
                durationMin: appt.service.durationMin,
                price: Number(appt.service.price),
            },
            professional: {
                id: appt.professional.id,
                name: appt.professional.name,
                lastName: appt.professional.lastName,
                phone: appt.professional.phone,
                avatar: appt.professional.avatar,
                specialty: appt.professional.specialty
                    ? {
                        id: appt.professional.specialty.id,
                        name: appt.professional.specialty.name,
                    }
                    : null,
                user: {
                    id: appt.professional.user.id,
                    email: appt.professional.user.email,
                },
            },
            client: appt.clientProfile
                ? {
                    id: appt.clientProfile.id,
                    name: appt.clientProfile.name,
                    lastName: appt.clientProfile.lastName,
                    user: {
                        id: appt.clientProfile.user.id,
                        email: appt.clientProfile.user.email,
                    },
                }
                : appt.guest
                    ? {
                        id: appt.guest.id,
                        name: appt.guest.name,
                        lastName: null,
                        user: { id: 0, email: appt.guest.email || "" },
                    }
                    : null,
        }));
    }
    // Obtener próximas citas de un usuario (cliente o profesional)
    static async getUpcomingAppointmentsByUser(userId) {
        const clientProfile = await prisma_1.default.clientProfile.findUnique({
            where: { userId },
        });
        const professionalProfile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
        const where = {};
        if (clientProfile) {
            where.OR = [{ clientProfileId: clientProfile.id }];
        }
        if (professionalProfile) {
            where.OR = where.OR
                ? [...where.OR, { professionalProfileId: professionalProfile.id }]
                : [{ professionalProfileId: professionalProfile.id }];
        }
        if (!where.OR)
            return [];
        const appointments = await prisma_1.default.appointment.findMany({
            where: {
                ...where,
                status: { not: "CANCELLED" },
            },
            include: {
                service: true,
                professional: { include: { user: true, specialty: true } },
                clientProfile: { include: { user: true } },
                guest: true,
            },
            orderBy: { date: "asc" },
        });
        const upcoming = appointments.filter((appt) => {
            const base = new Date(appt.date);
            const hours = Math.floor(appt.startMin / 60);
            const minutes = appt.startMin % 60;
            const fullDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes);
            return fullDate >= new Date();
        });
        return upcoming.map((appt) => ({
            id: appt.id,
            date: appt.date.toISOString().split("T")[0],
            startMin: appt.startMin,
            endMin: appt.endMin,
            notes: appt.notes,
            status: appt.status,
            service: {
                id: appt.service.id,
                name: appt.service.name,
                description: appt.service.description,
                durationMin: appt.service.durationMin,
                price: Number(appt.service.price),
            },
            professional: {
                id: appt.professional.id,
                name: appt.professional.name,
                lastName: appt.professional.lastName,
                phone: appt.professional.phone,
                avatar: appt.professional.avatar,
                specialty: appt.professional.specialty
                    ? {
                        id: appt.professional.specialty.id,
                        name: appt.professional.specialty.name,
                    }
                    : null,
                user: {
                    id: appt.professional.user.id,
                    email: appt.professional.user.email,
                },
            },
            client: appt.clientProfile
                ? {
                    id: appt.clientProfile.id,
                    name: appt.clientProfile.name,
                    lastName: appt.clientProfile.lastName,
                    user: {
                        id: appt.clientProfile.user.id,
                        email: appt.clientProfile.user.email,
                    },
                }
                : appt.guest
                    ? {
                        id: appt.guest.id,
                        name: appt.guest.name,
                        lastName: null,
                        user: { id: 0, email: appt.guest.email || "" },
                    }
                    : null,
        }));
    }
    // -----------------------------
    // 🔒 Helpers privados
    // -----------------------------
    // Obtener servicio por ID
    static async getServiceById(serviceId, professionalProfileId) {
        const service = await prisma_1.default.service.findFirst({
            where: {
                id: serviceId,
                profileId: professionalProfileId,
                isActive: true,
            },
        });
        if (!service) {
            throw new Error("Servicio no pertenece al profesional");
        }
        return service;
    }
    static async validateSchedule(professionalProfileId, date, startMin, endMin) {
        const jsDay = date.getUTCDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
        const schedule = await prisma_1.default.schedule.findFirst({
            where: {
                profileId: professionalProfileId,
                dayOfWeek,
                startMin: { lte: startMin },
                endMin: { gte: endMin },
                isActive: true,
            },
        });
        if (!schedule)
            throw new Error("Fuera de horario");
    }
    // Validar que no haya solapamiento de citas
    static async validateOverlap(professionalProfileId, date, startMin, endMin) {
        const overlap = await prisma_1.default.appointment.findFirst({
            where: {
                professionalProfileId,
                date,
                status: { not: "CANCELLED" },
                AND: [{ startMin: { lt: endMin } }, { endMin: { gt: startMin } }],
            },
        });
        if (overlap)
            throw new Error("Horario ocupado");
    }
}
exports.AppointmentService = AppointmentService;
