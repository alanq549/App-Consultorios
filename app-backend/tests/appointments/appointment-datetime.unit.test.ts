/// ARCHIVO: tests/appointments/appointment-datetime.unit.test.ts
/// Pruebas unitarias de PRE-D5 (Fase 5 - Misión 4): la fecha calendario de una cita se interpreta
/// siempre en UTC, independientemente de la zona horaria del servidor.

import { describe, it, expect } from "vitest";
import {
  buildUTCDate,
  parseCalendarDateUTC,
} from "@/shared/time/appointment-datetime";

describe("PRE-D5 — Aritmética de fechas de cita en UTC", () => {
  describe("parseCalendarDateUTC", () => {
    it("produce medianoche UTC exacta para una fecha calendario", () => {
      const date = parseCalendarDateUTC("2026-11-20");

      expect(date.toISOString()).toBe("2026-11-20T00:00:00.000Z");
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
    });

    it("no depende de la zona horaria local del proceso (mismo instante en cualquier TZ)", () => {
      // El instante resultante es idéntico sin importar el offset local del servidor:
      // la comparación se hace contra el reloj UTC, no contra representaciones locales.
      const date = parseCalendarDateUTC("2026-01-01");

      expect(date.getTime()).toBe(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
    });

    it("preserva el día calendario en el límite de año", () => {
      expect(parseCalendarDateUTC("2025-12-31").toISOString()).toBe(
        "2025-12-31T00:00:00.000Z",
      );
      expect(parseCalendarDateUTC("2026-01-01").toISOString()).toBe(
        "2026-01-01T00:00:00.000Z",
      );
    });
  });

  describe("buildUTCDate", () => {
    it("combina la fecha con los minutos del día en UTC", () => {
      const base = parseCalendarDateUTC("2026-11-20");
      const instant = buildUTCDate(base, 600); // 10:00 UTC

      expect(instant.toISOString()).toBe("2026-11-20T10:00:00.000Z");
    });

    it("usa los componentes UTC de la fecha base, no los locales", () => {
      // Aunque se construya una fecha con offset local, buildUTCDate toma sus componentes UTC.
      const base = new Date("2026-06-15T00:00:00.000Z");
      const instant = buildUTCDate(base, 90);

      expect(instant.toISOString()).toBe("2026-06-15T01:30:00.000Z");
    });

    it("acepta minutos fraccionarios de hora sin desbordar el día", () => {
      const base = parseCalendarDateUTC("2026-03-01");
      const instant = buildUTCDate(base, 1439); // 23:59 UTC

      expect(instant.toISOString()).toBe("2026-03-01T23:59:00.000Z");
      expect(instant.getUTCDate()).toBe(1);
    });
  });

  it("creación (medianoche UTC) e instante de fin comparten el mismo día calendario UTC", () => {
    const appointmentDate = parseCalendarDateUTC("2026-11-20");
    const end = buildUTCDate(appointmentDate, 660); // 11:00 UTC

    expect(appointmentDate.toISOString()).toBe("2026-11-20T00:00:00.000Z");
    expect(end.getUTCFullYear()).toBe(2026);
    expect(end.getUTCMonth()).toBe(10);
    expect(end.getUTCDate()).toBe(20);
  });
});
