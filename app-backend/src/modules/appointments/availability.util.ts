// src/modules/appointments/availability.util.ts

const SLOT_MINUTES = 15;

type Schedule = {
  startMin: number;
  endMin: number;
};

type Appointment = {
  startMin: number;
  endMin: number;
};

type Slot = {
  startMin: number;
  endMin: number;
};



/**
 * Genera slots disponibles para un día específico
 */
export function generateAvailabilitySlots(params: {
  schedules: Schedule[];        // horarios del profesional para ese día
  appointments: Appointment[];  // citas ya existentes (no canceladas)
  serviceDuration: number;      // duración del servicio
}): Slot[] {
  const { schedules, appointments, serviceDuration } = params;

  const slots: Slot[] = [];

  for (const schedule of schedules) {
    let cursor = schedule.startMin;

    while (cursor + serviceDuration <= schedule.endMin) {
      const candidate: Slot = {
        startMin: cursor,
        endMin: cursor + serviceDuration,
      };

      

      const overlaps = appointments.some(
        (appt) =>
          appt.startMin < candidate.endMin &&
          appt.endMin > candidate.startMin

          
      );

      if (!overlaps) {
        slots.push(candidate);
      }

      cursor += SLOT_MINUTES;
    }
  }
  

  return slots;
}
