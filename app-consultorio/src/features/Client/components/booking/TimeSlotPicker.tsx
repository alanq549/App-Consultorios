// src/features/client/components/booking/TimeSlotPicker.tsx
import { useEffect, useState } from "react";
import { getAvailability } from "@/api/appointment.api";
import type { TimeSlot } from "@/types/booking.types";

interface TimeSlotPickerProps {
  professionalId: number;
  serviceId: number;
  date: string;
  dayOfWeek?: number; // opcional, si quieres usarlo
  onSelect: (slot: TimeSlot) => void;
  onBack: () => void; // 👈 nuevo

}

export function TimeSlotPicker({
  professionalId,
  serviceId,
  date,
  onSelect,
  onBack,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TimeSlot | null>(null);

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const normalizeDay = (apiDay: number) => (apiDay - 1 + 7) % 7;
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  useEffect(() => {
    if (!professionalId || !serviceId || !date) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setSlots([]);
    setSelected(null);

    getAvailability(professionalId, serviceId, date)
      .then((data: TimeSlot[]) => {
        const normalized = data.map((slot) => ({
          ...slot,
          dayOfWeek:
            slot.dayOfWeek !== undefined
              ? normalizeDay(slot.dayOfWeek)
              : undefined,
        }));
        setSlots(normalized);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [professionalId, serviceId, date]);

  if (loading)
    return (
      <p className="text-gray-500 dark:text-gray-400">
        Cargando horarios…
      </p>
    );

  if (!slots.length)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-gray-500 dark:text-gray-400">
          No hay horarios disponibles para esta fecha.
        </p>

        <button
          onClick={onBack}
          className="
            py-2 px-4
            rounded-md
            font-medium
            transition
            border border-gray-200 dark:border-gray-700
            bg-white/60 dark:bg-neutral-800/60
            backdrop-blur-md
            hover:bg-gray-100 dark:hover:bg-neutral-700
            text-gray-900 dark:text-gray-100
          "
        >
          Volver
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {slots.map((slot, i) => {
          const isSelected =
            selected?.startMin === slot.startMin &&
            selected?.endMin === slot.endMin;

          return (
            <button
              key={i}
              onClick={() => {
                setSelected(slot);
                onSelect(slot);
              }}
              className={`
                px-4 py-2
                rounded-lg
                text-sm font-medium
                transition
                border
                backdrop-blur-md
                ${
                  isSelected
                    ? `
                      bg-indigo-600
                      text-white
                      border-indigo-600
                      shadow-md
                    `
                    : `
                      bg-white/60 dark:bg-neutral-800/60
                      border-gray-200 dark:border-gray-700
                      text-gray-800 dark:text-gray-100
                      hover:bg-gray-100 dark:hover:bg-neutral-700
                    `
                }
              `}
            >
              {slot.dayOfWeek !== undefined
                ? `${dayNames[slot.dayOfWeek]} `
                : ""}
              {formatTime(slot.startMin)} – {formatTime(slot.endMin)}
            </button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="
          self-start
          mt-2
          py-2 px-4
          rounded-md
          font-medium
          transition
          border border-gray-200 dark:border-gray-700
          bg-white/60 dark:bg-neutral-800/60
          backdrop-blur-md
          hover:bg-gray-100 dark:hover:bg-neutral-700
          text-gray-900 dark:text-gray-100
        "
      >
        ← Volver al servicio
      </button>
    </div>
  );
}

