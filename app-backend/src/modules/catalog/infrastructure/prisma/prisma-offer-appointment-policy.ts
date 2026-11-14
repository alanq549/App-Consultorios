/// ARCHIVO: src/modules/catalog/infrastructure/prisma/prisma-offer-appointment-policy.ts
/// Adaptador de lectura de citas para la política D5.
///
/// Es un sondeo temporal *read-only* sobre la tabla `Appointment` hasta que el módulo Appointments
/// exponga su contrato de lectura. No importa el módulo Appointments ni su infraestructura; sólo
/// reutiliza la aritmética UTC canónica compartida (`@/shared/time/appointment-datetime`).

import { TransactionContext } from "@/shared/types/transaction-context";
import { buildUTCDate } from "@/shared/time/appointment-datetime";
import { OfferAppointmentPolicyPort } from "../../application/ports/offer-appointment-policy.port";
import { extractPrismaClient } from "./prisma-transaction-context";

export class PrismaOfferAppointmentPolicy implements OfferAppointmentPolicyPort {
  async countByService(
    serviceId: number,
    txContext?: TransactionContext,
  ): Promise<number> {
    const db = extractPrismaClient(txContext);
    return db.appointment.count({ where: { serviceId } });
  }

  async hasBlockingAppointments(
    serviceId: number,
    now: Date,
    txContext?: TransactionContext,
  ): Promise<boolean> {
    const db = extractPrismaClient(txContext);
    const appointments = await db.appointment.findMany({
      where: { serviceId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { date: true, endMin: true },
    });

    return appointments.some(
      (appointment) =>
        buildUTCDate(appointment.date, appointment.endMin).getTime() >
        now.getTime(),
    );
  }
}
