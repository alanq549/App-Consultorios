/// ARCHIVO: src/modules/appointments/appointment-lifecycle.ts
/// Orquestador global del ciclo de vida de las citas.
///
/// Propósito: extraer la lógica del cron a una función testeable. Es un job de sistema de alcance
/// global: NO filtra por tenant ni asume un tenant por defecto. `Appointment` no pertenece a un
/// tenant (el alcance se deriva de la afiliación del profesional), de modo que el job procesa por
/// igual las citas de todos los tenants.

import prisma from "@/shared/database/prisma";
import { NotificationService } from "../notifications/notifications.service";

/// Construye el instante UTC real de una cita combinando su fecha (UTC) con los minutos del día.
function buildUTCDate(baseDate: Date, minutes: number): Date {
  const utc = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    0,
    minutes,
    0,
    0,
  );

  return new Date(utc);
}

/// Procesa el ciclo de vida de las citas pendientes y confirmadas:
/// - `PENDING` cuya hora de inicio ya pasó y nunca se confirmó → `CANCELLED`.
/// - `CONFIRMED` cuya hora de fin ya pasó → `COMPLETED`.
///
/// Transición idempotente: cada cambio usa `updateMany` con el `id` **y el estado esperado** como
/// filtro, y la notificación se envía sólo si `count === 1`. Así, si dos instancias del backend
/// (varias réplicas) ejecutan el cron a la vez, únicamente una gana la transición y notifica; la
/// otra obtiene `count === 0` y no vuelve a notificar. No se requiere Redis ni lock distribuido.
///
/// Limitación conocida: si el proceso cae **después** de confirmar el cambio de estado y **antes**
/// de enviar la notificación, ésta puede perderse. La idempotencia protege contra el doble envío,
/// no contra la pérdida; para entrega garantizada haría falta un outbox transaccional (un lock
/// distribuido por sí solo no cierra esa ventana).
///
/// @param now Instante de referencia (inyectable en pruebas; por defecto el actual).
/// @returns Número de citas cuyo estado cambió.
export async function processAppointmentLifecycle(
  now: Date = new Date(),
): Promise<number> {
  const nowMs = now.getTime();
  let changes = 0;

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      clientProfile: true,
      professional: true,
    },
  });

  for (const appointment of appointments) {
    const startDateTime = buildUTCDate(appointment.date, appointment.startMin);
    const endDateTime = buildUTCDate(appointment.date, appointment.endMin);
    const start = startDateTime.getTime();
    const end = endDateTime.getTime();

    // 🔴 cancelar si nunca se confirmó
    if (appointment.status === "PENDING" && start <= nowMs) {
      const { count } = await prisma.appointment.updateMany({
        where: { id: appointment.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      // Sólo la instancia que ganó la transición notifica (evita notificaciones duplicadas).
      if (count === 1 && appointment.clientProfile) {
        await NotificationService.notifyAppointmentCancelled(
          appointment.clientProfile.userId,
          appointment.professional.userId,
          appointment.id,
          "SYSTEM",
        );
      }

      changes += count;
      continue;
    }

    // 🟢 completar si terminó
    if (appointment.status === "CONFIRMED" && end <= nowMs) {
      const { count } = await prisma.appointment.updateMany({
        where: { id: appointment.id, status: "CONFIRMED" },
        data: { status: "COMPLETED" },
      });

      if (count === 1 && appointment.clientProfile) {
        await NotificationService.notifyAppointmentCompleted(
          appointment.clientProfile.userId,
          appointment.professional.userId,
          appointment.id,
        );
      }

      changes += count;
    }
  }

  return changes;
}
