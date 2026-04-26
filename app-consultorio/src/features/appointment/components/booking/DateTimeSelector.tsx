// src/features/appointment/components/booking/DateTimeSelector.tsx
import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { useAvailability } from "@/hooks/appointments/useAvailability";
import type { Service } from "@/types/service.type";
import { generateNextDays, minutesToTime } from "@/utils/time";

interface Props {
  professionalId: number;
  service: Service;
  onSelect: (date: string, startMin: number, endMin: number) => void;
}

export function DateTimeSelector({ professionalId, service, onSelect }: Props) {
  const days = generateNextDays(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ startMin: number; endMin: number } | null>(null);

  const { data: slots = [], isLoading } = useAvailability(
    professionalId,
    service.id,
    selectedDate
  );

  const handleSlotClick = (startMin: number, endMin: number) => {
    setSelectedSlot({ startMin, endMin });
    onSelect(selectedDate!, startMin, endMin);
  };

  return (
    <div className="space-y-5">

      {/* DAY SELECTOR */}
      <div>
        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3
        ">
          <CalendarDays size={12} /> Selecciona un día
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {days.map((d) => {
            const isActive = selectedDate === d.date;
            return (
              <button
                key={d.date}
                onClick={() => {
                  setSelectedDate(d.date);
                  setSelectedSlot(null);
                }}
                className={`
                  flex-shrink-0 flex flex-col items-center
                  px-3 py-2.5 rounded-xl min-w-[56px]
                  border transition-all text-center
                  ${isActive
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/30"
                    : "bg-white/40 dark:bg-white/[0.04] border-white/30 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-indigo-300/50 dark:hover:border-indigo-600/30 hover:bg-white/70 dark:hover:bg-white/[0.07]"
                  }
                `}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? "text-indigo-200" : "text-gray-400 dark:text-gray-500"}`}>
                  {d.date ?? d.label.slice(0, 3)}
                </span>
                <span className="text-sm font-bold mt-0.5">
                  {d.date ?? d.label}

                </span>


              </button>
            );
          })}
        </div>
      </div>

      {/* TIME SLOTS */}
      {selectedDate && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
            <Clock size={12} /> Horarios disponibles
          </p>

          {isLoading && (
            <div className="flex flex-wrap gap-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-16 rounded-xl bg-white/40 dark:bg-white/[0.04] border border-white/30 dark:border-white/10 animate-pulse"
                />
              ))}
            </div>
          )}

          {!isLoading && slots.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Sin horarios disponibles para este día.
              </p>
            </div>
          )}

          {!isLoading && slots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const isActiveSlot =
                  selectedSlot?.startMin === slot.startMin &&
                  selectedSlot?.endMin === slot.endMin;
                return (
                  <button
                    key={`${slot.startMin}-${slot.endMin}`}
                    onClick={() => handleSlotClick(slot.startMin, slot.endMin)}
                    className={`
                      px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                      ${isActiveSlot
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/30"
                        : "bg-white/40 dark:bg-white/[0.04] border-white/30 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-indigo-300/50 dark:hover:border-indigo-600/30 hover:bg-white/70 dark:hover:bg-white/[0.07]"
                      }
                    `}
                  >
                    {minutesToTime(slot.startMin)}
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