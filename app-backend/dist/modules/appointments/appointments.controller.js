"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsController = void 0;
const appointments_service_1 = require("./appointments.service");
const appointments_dto_1 = require("./appointments.dto");
const prisma_1 = __importDefault(require("@/core/prisma"));
class AppointmentsController {
    // crear una cita
    static async create(req, res, next) {
        try {
            // 1️⃣ Obtener el profile real del usuario
            const clientProfile = await prisma_1.default.clientProfile.findUnique({
                where: { userId: req.user.id },
            });
            if (!clientProfile) {
                throw new Error("Perfil de cliente no existe");
            }
            const clientProfileId = clientProfile.id;
            // 2️⃣ Validar + tipar con Zod
            const data = appointments_dto_1.CreateAppointmentSchema.parse(req.body);
            // 3️⃣ Crear la cita
            const appointment = await appointments_service_1.AppointmentService.create(clientProfileId, data);
            res.status(201).json(appointment);
        }
        catch (err) {
            next(err);
        }
    }
    //crear cita para guests (cliente no registrado/ocasional)
    static async createGuest(req, res, next) {
        try {
            // Validar la data con Zod (schema para guests)
            const guestData = appointments_dto_1.CreateGuestAppointmentSchema.parse(req.body);
            // 1️⃣ Obtener el professionalProfileId desde la data validada
            const professionalProfileId = guestData.professionalProfileId;
            // 2️⃣ Crear la cita
            const appointment = await appointments_service_1.AppointmentService.createGuest(professionalProfileId, guestData);
            res.status(201).json(appointment);
        }
        catch (err) {
            next(err);
        }
    }
    // Historial de todas las citas del usuario
    static async history(req, res, next) {
        try {
            const appointments = await appointments_service_1.AppointmentService.getAppointmentsByUser(req.user.id);
            res.json(appointments);
        }
        catch (err) {
            next(err);
        }
    }
    // Próximas citas del usuario
    static async upcoming(req, res, next) {
        try {
            const appointments = await appointments_service_1.AppointmentService.getUpcomingAppointmentsByUser(req.user.id);
            res.json(appointments);
        }
        catch (err) {
            next(err);
        }
    }
    // GET /api/appointments/availability?professionalId=1&serviceId=2&date=2026-01-14
    static async availability(req, res, next) {
        try {
            const professionalProfileId = Number(req.query.professionalId);
            const serviceId = Number(req.query.serviceId);
            const dateStr = req.query.date;
            if (!professionalProfileId || !serviceId || !dateStr) {
                return res.status(400).json({ message: "Faltan parámetros" });
            }
            // Fecha LOCAL del negocio
            const date = new Date(`${dateStr}T00:00:00`);
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(24, 0, 0, 0);
            const slots = await appointments_service_1.AppointmentService.getAvailability(professionalProfileId, serviceId, startOfDay, endOfDay);
            res.json(slots);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AppointmentsController = AppointmentsController;
