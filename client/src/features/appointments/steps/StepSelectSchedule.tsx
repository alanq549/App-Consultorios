import { useState } from "react";

export type Schedule = {
  dayOfWeek: number; // 0=Domingo .. 6=Sábado
  startTime: string; // "09:00"
  endTime: string; // "18:00"
};

type Props = {
  schedules: Schedule[];
  onSelectSchedule: (date: string, time: string) => void;
};

export default function StepSelectSchedule({
  schedules,
  onSelectSchedule,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Calcula las fechas del mes actual
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Día 1 del mes
  const firstDay = new Date(year, month, 1);
  // Último día del mes
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Días previos al primer día para alinear calendario (0=dom)
  const startDayWeek = firstDay.getDay();

  // Generar array para mostrar el calendario
  const calendarDays: (Date | null)[] = [];

  // Agrega huecos previos para alinear al día correcto
  for (let i = 0; i < startDayWeek; i++) {
    calendarDays.push(null);
  }

  // Agrega días reales del mes
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(new Date(year, month, d));
  }

  // Función que checa si un día es seleccionable (no pasado y tiene horario)
  // Cambiar isDateSelectable
  const isDateSelectable = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // para comparar solo fecha
    if (date < now) return false; // día pasado
    // Checa si hay horario para ese día de la semana
    const hasSchedule = schedules.some((s) => s.dayOfWeek === date.getDay());
    console.log(" - Tiene horario:", hasSchedule);

    return hasSchedule;
  };

  // Obtener horarios disponibles para un día
  const getSlotsForDate = (date: Date): string[] => {
    const dow = date.getDay();
    const schedule = schedules.find((s) => s.dayOfWeek === dow);
    if (!schedule) return [];
    return generateTimeSlots(schedule.startTime, schedule.endTime, 30);
  };

  const handleDateClick = (date: Date) => {
    if (!isDateSelectable(date)) return;
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeClick = (time: string) => {
    if (selectedDate) {
      onSelectSchedule(selectedDate.toISOString().slice(0, 10), time);
      setSelectedTime(time);
    }
  };

  // Días de la semana para encabezado
  const daysOfWeek = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sáb"];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold dark:text-white/90">
        Selecciona un día disponible. El tiempo de duración es estimado.
      </h2>

      <div className="grid grid-cols-7 gap-2 text-center select-none">
        {daysOfWeek.map((day) => (
          <div key={day} className="font-bold text-gray-600 dark:text-gray-300">
            {day}
          </div>
        ))}

        {calendarDays.map((date, idx) => {
          if (!date) return <div key={idx}></div>; // hueco vacío

          const selectable = isDateSelectable(date);
          const isSelected =
            selectedDate && date.toDateString() === selectedDate.toDateString();

          return (
            <button
              key={date.toISOString()}
              disabled={!selectable}
              onClick={() => handleDateClick(date)}
              className={`
    rounded-lg py-2
    ${
      selectable
        ? "cursor-pointer text-teal-700 dark:text-white hover:bg-teal-100 dark:hover:bg-teal-800 dark:hover:text-white"
        : "text-teal-400 dark:text-gray-400 cursor-not-allowed"
    }
    ${
      isSelected
        ? "bg-teal-500 dark:bg-teal-800/20 dark:backdrop:blur-sm dark:border dark:border-teal-400 text-white  dark:text-white"
        : ""
    }
    transition
  `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Horarios disponibles */}
      {selectedDate && (
        <div className="mt-6  mx-auto bg-white dark:bg-transparent backdrop:blur-sm  rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4  dark:text-white/90 text-center pt-4">
            Horarios disponibles para{" "}
            {selectedDate.toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>

          {getSlotsForDate(selectedDate).length === 0 ? (
            <p className="text-center text-red-500 font-semibold flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              No hay horarios disponibles ese día.
            </p>
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 border-gray-800 max-w-2xl    ">
              {getSlotsForDate(selectedDate).map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => handleTimeClick(slot)}
                    className={`flex-shrink-0 px-5 py-3 rounded-lg border text-sm font-medium transition
                ${
                  isSelected
                    ? "bg-teal-600 text-white  border-teal-600 shadow-lg"
                    : "bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 dark:text-gray-300 hover:bg-teal-100 dark:hover:bg-teal-900"
                }
              `}
                    aria-pressed={isSelected}
                    aria-label={`Seleccionar horario ${slot}`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper para generar slots (igual que antes)
function generateTimeSlots(
  start: string,
  end: string,
  interval = 30
): string[] {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  const slots: string[] = [];
  const current = new Date();
  current.setHours(startH, startM, 0, 0);

  const endTime = new Date();
  endTime.setHours(endH, endM, 0, 0);

  while (current < endTime) {
    slots.push(current.toTimeString().slice(0, 5)); // HH:MM
    current.setMinutes(current.getMinutes() + interval);
  }

  return slots;
}
