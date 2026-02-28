"use strict";
// src/modules/appointments/availability.util.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAvailabilitySlots = generateAvailabilitySlots;
const SLOT_MINUTES = 15;
/**
 * Genera slots disponibles para un día específico
 */
function generateAvailabilitySlots(params) {
    const { schedules, appointments, serviceDuration } = params;
    const slots = [];
    for (const schedule of schedules) {
        let cursor = schedule.startMin;
        while (cursor + serviceDuration <= schedule.endMin) {
            const candidate = {
                startMin: cursor,
                endMin: cursor + serviceDuration,
            };
            const overlaps = appointments.some((appt) => appt.startMin < candidate.endMin &&
                appt.endMin > candidate.startMin);
            if (!overlaps) {
                slots.push(candidate);
            }
            cursor += SLOT_MINUTES;
        }
    }
    return slots;
}
