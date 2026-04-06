// src/features/appointments/components/AppointmentList.tsx
import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import type { AppointmentResponseDTO } from "@/types/appointments.types";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentCalendarView } from "./AppointmentCalendarView";

interface Props {
  appointments: AppointmentResponseDTO[];
}

export function AppointmentList({ appointments }: Props) {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  if (!appointments.length) {
    return (
      <div className="text-slate-400 text-sm font-bold text-center py-10">
        No hay citas registradas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* TOGGLE DE VISTA */}
      <div className="flex justify-end">
        <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-white/10 gap-0.5">
          <button
            onClick={() => setView("calendar")}
            className={`p-2 rounded-lg transition-all duration-200 ${
              view === "calendar"
                ? "bg-white dark:bg-white/10 text-blue-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
            title="Vista calendario"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 rounded-lg transition-all duration-200 ${
              view === "list"
                ? "bg-white dark:bg-white/10 text-blue-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
            title="Vista lista"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <AppointmentCalendarView appointments={appointments} />
      ) : (
        <div className="grid gap-3">
          {appointments.map((a) => (
            <AppointmentCard key={a.id} appointment={a} />
          ))}
        </div>
      )}
    </div>
  );
}