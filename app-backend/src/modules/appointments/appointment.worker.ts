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


function buildUTCDate(baseDate: Date, minutes: number) {
  const utc = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    0,
    minutes,
    0,
    0
  )

  return new Date(utc)
}
// Cron job para revisar citas cada minuto
cron.schedule("* * * * *", async () => {

  const now = Date.now()
  let changes = 0

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      clientProfile: true,
      professional: true,
    },
  })

  for (const appointment of appointments) {

    const startDateTime = buildUTCDate(
      appointment.date,
      appointment.startMin
    )

    const endDateTime = buildUTCDate(
      appointment.date,
      appointment.endMin
    )

    const start = startDateTime.getTime()
    const end = endDateTime.getTime()

    // 🔴 cancelar si nunca se confirmó
    if (appointment.status === "PENDING" && start <= now) {

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED" },
      })

      if (appointment.clientProfile) {
        await NotificationService.notifyAppointmentCancelled(
          appointment.clientProfile.userId,
          appointment.professional.userId,
          appointment.id,
          "SYSTEM"
        )
      }

      console.log(
        `🔴 Cita #${appointment.id} cancelada`,
        startDateTime.toISOString()
      )

      changes++
      continue
    }

    // 🟢 completar si terminó
    if (appointment.status === "CONFIRMED" && end <= now) {

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "COMPLETED" },
      })

      if (appointment.clientProfile) {
        await NotificationService.notifyAppointmentCompleted(
          appointment.clientProfile.userId,
          appointment.professional.userId,
          appointment.id
        )
      }

      console.log(
        `🟢 Cita #${appointment.id} completada`,
        endDateTime.toISOString()
      )

      changes++
    }
  }

  if (changes > 0) {
    console.log(`✅ ${changes} citas procesadas`)
  }

})
