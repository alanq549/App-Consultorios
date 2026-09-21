"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAppointmentStatusSchema = exports.CreateGuestAppointmentSchema = exports.CreateAppointmentSchema = void 0;
// src/modules/appointments/appointments.dto.ts
const zod_1 = require("zod");
const SLOT_MINUTES = 15;
exports.CreateAppointmentSchema = zod_1.z.object({
    professionalProfileId: zod_1.z.number().int(),
    serviceId: zod_1.z.number().int(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    startMin: zod_1.z
        .number()
        .int()
        .min(0)
        .max(1440)
        .refine((v) => v % SLOT_MINUTES === 0, {
        message: "startMin debe ser múltiplo de 15",
    }),
    notes: zod_1.z.string().optional(),
});
/// clientes ocacionales (invitados) los registran los profesionales
exports.CreateGuestAppointmentSchema = zod_1.z.object({
    professionalProfileId: zod_1.z.number().int(),
    serviceId: zod_1.z.number().int(),
    date: zod_1.z.string().datetime(),
    startMin: zod_1.z.number().min(0).max(1440),
    notes: zod_1.z.string().optional(),
    guestName: zod_1.z.string(),
    guestEmail: zod_1.z.string().email().optional(),
    guestPhone: zod_1.z.string().optional(),
});
// DTO para actualizar el estado de una cita (confirmar o cancelar)
exports.UpdateAppointmentStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["CONFIRMED", "CANCELLED"]),
});
