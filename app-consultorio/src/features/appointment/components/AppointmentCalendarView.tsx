// src/features/appointments/components/AppointmentCalendarView.tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { staticbackend } from "@/config/variables";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { useUpdateAppointmentStatus } from "@/hooks/appointments/useUpdateAppointmentStatus";
import type { AppointmentResponseDTO } from "@/types/appointments.types";

interface Props {
  appointments: AppointmentResponseDTO[];
}

const DAYS_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const AVATAR_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300" },
];

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ── Fila de cita con acciones ──────────────────────────────────────────────
function AppointmentRow({
  appointment,
  colorIdx,
}: {
  appointment: AppointmentResponseDTO;
  colorIdx: number;
}) {
  const updateStatus = useUpdateAppointmentStatus();
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];

  const name = appointment.client
    ? `${appointment.client.name} ${appointment.client.lastName ?? ""}`.trim()
    : (appointment.guest?.name ?? "Invitado");

  const avatarUrl = appointment.client?.avatar
    ? `${staticbackend}${appointment.client.avatar}`
    : null;

  const isPending = appointment.status === "PENDING";
  const isConfirmed = appointment.status === "CONFIRMED";
  const canAct = isPending || isConfirmed;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
      {/* AVATAR */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${color.bg} ${color.text}`}
        >
          {getInitials(name)}
        </div>
      )}

      {/* INFO */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-800 dark:text-white truncate leading-tight">
          {name}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold">
          {formatTime(appointment.startMin)} – {formatTime(appointment.endMin)}
        </p>
      </div>

      {/* ACCIONES o BADGE */}
      {canAct ? (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {isPending && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStatus.mutate({ appointmentId: appointment.id, status: "CONFIRMED" });
              }}
              disabled={updateStatus.isPending}
              title="Confirmar"
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-90 disabled:opacity-50 shadow-sm shadow-emerald-500/30"
            >
              <Check size={12} strokeWidth={3} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateStatus.mutate({ appointmentId: appointment.id, status: "CANCELLED" });
            }}
            disabled={updateStatus.isPending}
            title="Cancelar"
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-500 text-red-400 hover:text-white transition-all active:scale-90 disabled:opacity-50"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <AppointmentStatusBadge status={appointment.status} />
      )}
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────
export function AppointmentCalendarView({ appointments }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = getWeekStart(new Date(today));
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthLabel = weekDays[0].toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const byDay = new Map<string, AppointmentResponseDTO[]>();
  appointments.forEach((a) => {
    const key = new Date(a.date).toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  });

  return (
    <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md rounded-[2rem] border border-white/30 dark:border-white/10 overflow-visible p-5 space-y-4">

      {/* NAV */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => { setWeekOffset((o) => o - 1); setActiveDay(null); }}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] capitalize">
          {monthLabel}
        </p>
        <button
          onClick={() => { setWeekOffset((o) => o + 1); setActiveDay(null); }}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const key = day.toISOString().slice(0, 10);
          const dayAppts = byDay.get(key) ?? [];
          const isToday = day.getTime() === today.getTime();
          const isActive = activeDay === i;
          const hasAppts = dayAppts.length > 0;

          return (
            <div key={key} className="relative">
              {/* CELDA */}
              <div
                onClick={() => hasAppts && setActiveDay(isActive ? null : i)}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all duration-300 min-h-[90px] select-none ${
                  isActive
                    ? "border-blue-400/60 bg-blue-50/60 dark:bg-blue-900/15 shadow-lg shadow-blue-500/10"
                    : isToday
                    ? "border-blue-400/40 bg-blue-50/50 dark:bg-blue-900/10"
                    : hasAppts
                    ? "border-white/40 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 cursor-pointer"
                    : "border-white/20 dark:border-white/5 bg-white/20 dark:bg-white/[0.02]"
                }`}
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-neutral-500">
                  {DAYS_LABEL[i]}
                </span>

                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black transition-all ${
                    isToday || isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {day.getDate()}
                </div>

                {hasAppts && (
                  <div className="flex justify-center mt-auto" style={{ paddingLeft: "4px" }}>
                    {dayAppts.slice(0, 3).map((a, idx) => {
                      const name = a.client
                        ? `${a.client.name} ${a.client.lastName ?? ""}`.trim()
                        : (a.guest?.name ?? "Invitado");
                      const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                      const avatarUrl = a.client?.avatar
                        ? `${staticbackend}${a.client.avatar}`
                        : null;

                      return avatarUrl ? (
                        <img
                          key={a.id}
                          src={avatarUrl}
                          alt={name}
                          className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-neutral-900 shadow-sm"
                          style={{ marginLeft: idx > 0 ? "-6px" : 0 }}
                        />
                      ) : (
                        <div
                          key={a.id}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black ${color.bg} ${color.text} border-2 border-white dark:border-neutral-900`}
                          style={{ marginLeft: idx > 0 ? "-6px" : 0 }}
                        >
                          {getInitials(name)}
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-black bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border-2 border-white dark:border-neutral-900"
                        style={{ marginLeft: "-6px" }}
                      >
                        +{dayAppts.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {!hasAppts && (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 mt-auto" />
                )}
              </div>

              {/* PANEL EXPANDIDO — click, no hover */}
              {isActive && hasAppts && (
                <div
                  className={`absolute top-[calc(100%+10px)] z-50 w-64 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                    i >= 4 ? "right-0" : "left-0"
                  }`}
                >
                  {/* Flecha */}
                  <div
                    className={`absolute -top-[7px] w-3.5 h-3.5 bg-white dark:bg-neutral-900 border-l border-t border-white/40 dark:border-white/10 rotate-45 ${
                      i >= 4 ? "right-5" : "left-5"
                    }`}
                  />

                  {/* Header del panel */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white/40 dark:bg-white/5">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white capitalize">
                        {day.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" })}
                      </p>
                      <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                        {dayAppts.length} {dayAppts.length === 1 ? "cita" : "citas"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveDay(null); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>

                  {/* Hint de acciones — solo si hay PENDING o CONFIRMED */}
                  {dayAppts.some(a => a.status === "PENDING" || a.status === "CONFIRMED") && (
                    <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100/50 dark:border-blue-900/20">
                      <p className="text-[9px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                        Pasa el cursor para ver acciones
                      </p>
                    </div>
                  )}

                  {/* FILAS */}
                  <div className="p-1.5 space-y-0.5">
                    {dayAppts.map((a, idx) => (
                      <AppointmentRow key={a.id} appointment={a} colorIdx={idx} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LEYENDA */}
      <div className="flex items-center gap-4 px-1 pt-1 border-t border-white/20 dark:border-white/5 flex-wrap">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-neutral-600">
          Estado
        </span>
        {[
          { label: "Pendiente", color: "bg-amber-200 dark:bg-amber-900/40" },
          { label: "Confirmada", color: "bg-emerald-200 dark:bg-emerald-900/40" },
          { label: "Cancelada", color: "bg-red-200 dark:bg-red-900/40" },
          { label: "Finalizada", color: "bg-blue-200 dark:bg-blue-900/40" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}