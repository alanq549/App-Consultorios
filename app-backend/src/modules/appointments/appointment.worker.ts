// src/modules/appointments/appointment.worker.ts
import prisma from "../../core/prisma";
import cron from "node-cron";
import { NotificationService } from "../notifications/notifications.service";

/* import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

// Creamos la conexión con la URL de Upstash
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // 🔹 obligatorio para BullMQ
  enableReadyCheck: true,     // 🔹 recomendable con Upstash
}) as any;

// Cola de appointments
export const appointmentQueue = new Queue("appointments", { connection });

// Worker que procesa los jobs
new Worker(
  "appointments",
  async (job) => {
    if (job.name.startsWith("cancel")) {
      await prisma.appointment.update({
        where: { id: job.data.id },
        data: { status: "CANCELLED" },
      });
      console.log(`[Worker] Cita cancelada: ${job.data.id}`);
    }
    if (job.name.startsWith("complete")) {
      await prisma.appointment.update({
        where: { id: job.data.id },
        data: { status: "COMPLETED" },
      });
      console.log(`[Worker] Cita completada: ${job.data.id}`);
    }
  },
  { connection }
);

console.log("🟢 Worker de citas iniciado, escuchando jobs...");
 */

// Cron job para revisar citas cada minuto
cron.schedule("* * * * *", async () => {
  const now = new Date();
  let changes = 0;

  // 🔹 Inicio y fin del día en UTC
  const startOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  const endOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      date: {
        gte: startOfToday,
        lt: endOfToday,
      },
    },
    include: {
      clientProfile: true,
      professional: true,
    },
  });

  for (const appointment of appointments) {
    const startDateTime = new Date(appointment.date);
    startDateTime.setMinutes(appointment.startMin);

    const endDateTime = new Date(appointment.date);
    endDateTime.setMinutes(appointment.endMin);

    // 🔴 Cancelar si no fue confirmada
    if (appointment.status === "PENDING" && startDateTime <= now) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED" },
      });

      if (appointment.clientProfile) {
        await NotificationService.notifyAppointmentCancelled(
          appointment.clientProfile.userId,
          appointment.professional.userId,
          appointment.id,
          "SYSTEM",
        );
      }
      console.log(
        `🔴 Cita #${appointment.id} cancelada (inicio: ${startDateTime.toISOString()})`,
      );

      changes++;
      continue;
    }

    // 🟢 Completar si terminó
    if (appointment.status === "CONFIRMED" && endDateTime <= now) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "COMPLETED" },
      });

      if (appointment.clientProfile) {
        await NotificationService.notifyAppointmentCompleted(
          appointment.clientProfile.userId,
          appointment.professional.userId,
          appointment.id,
        );
      }

      console.log(
        `🟢 Cita #${appointment.id} completada (fin: ${endDateTime.toISOString()})`,
      );

      changes++;
    }
  }

  // Solo log si hubo cambios
  if (changes > 0) {
    console.log(`✅ ${changes} cita(s) procesadas a las ${now.toISOString()}`);
  }
});
