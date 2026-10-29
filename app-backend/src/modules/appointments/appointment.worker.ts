// src/modules/appointments/appointment.worker.ts
import cron from "node-cron";
import { processAppointmentLifecycle } from "./appointment-lifecycle";

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


// Cron job para revisar citas cada minuto.
// Es un orquestador de alcance global: procesa las citas de todos los tenants sin asumir un
// tenant por defecto. La lógica vive en `processAppointmentLifecycle` para poder probarse.
cron.schedule("* * * * *", async () => {
  try {
    const changes = await processAppointmentLifecycle()

    if (changes > 0) {
      console.log(`✅ ${changes} citas procesadas`)
    }
  } catch (error) {
    console.error("❌ Error al procesar el ciclo de vida de las citas", error)
  }
})

