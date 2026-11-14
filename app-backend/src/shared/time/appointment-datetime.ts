/// ARCHIVO: src/shared/time/appointment-datetime.ts
/// Utilidades transversales de fecha/hora para citas (PRE-D5, Fase 5 - Misión 4).
///
/// Estándar canónico de D5: la fecha calendario de una cita (`Appointment.date`) representa
/// estrictamente la **medianoche en UTC** (`T00:00:00.000Z`). El instante real de la cita se
/// obtiene combinando esa fecha con los minutos del día en UTC.
///
/// Se ubica en `shared/` para que tanto Appointments (creación/persistencia) como Catalog
/// (política de desactivación de ofertas) usen exactamente la misma aritmética sin acoplarse
/// entre módulos.

/// Convierte una fecha calendario `YYYY-MM-DD` a su instante de medianoche en UTC.
///
/// A diferencia de `new Date("...T00:00:00")`, que interpreta la medianoche en la zona horaria
/// local del servidor, esta función es independiente de la zona horaria del proceso.
export function parseCalendarDateUTC(date: string): Date {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/// Construye el instante UTC real de una cita combinando su fecha (UTC) con los minutos del día.
///
/// Es la función canónica referida por D5: se aplica sobre fechas ya normalizadas a medianoche
/// UTC para obtener el instante de inicio o fin de una cita.
export function buildUTCDate(baseDate: Date, minutes: number): Date {
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
