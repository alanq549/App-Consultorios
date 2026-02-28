import { useState, useEffect } from "react";
import { getAppointmentsHistory, getUpcomingAppointments } from "@/api/appointment.api";
import type { AppointmentResponseDTO } from "@/types/appointments.types";
import { staticbackend } from "@/config/variables";
import { Calendar, Clock, User, ArrowRight, History, CalendarCheck } from "lucide-react";

export const ClientAppointments = () => {
  const [appointments, setAppointments] = useState<AppointmentResponseDTO[]>([]);
  const [upcoming, setUpcoming] = useState<AppointmentResponseDTO[]>([]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUpcomingAppointments(), getAppointmentsHistory()])
      .then(([upcomingData, historyData]) => {
        setUpcoming(upcomingData);
        setAppointments(historyData);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

 const formatAppointmentDate = (dateStr: string) => {
  const date = new Date(dateStr); // toma la fecha y hora correcta
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).replace(".", "");
};

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return { text: "Pendiente", color: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
      case "CONFIRMED":
        return { text: "Confirmada", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" };
      case "CANCELLED":
        return { text: "Cancelada", color: "bg-red-500/10 border-red-500/20 text-red-400" };
      case "COMPLETED":
        return { text: "Finalizada", color: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400" };
      default:
        return { text: status, color: "bg-white/10 border-white/20 text-white/40" };
    }
  };

  const avatarUrl = (professional: { avatar?: string | null }) =>
    professional.avatar ? `${staticbackend}${professional.avatar}` : "/imgs/image.png";

  const renderAppointmentCard = (appt: AppointmentResponseDTO, isHistory: boolean) => (
    <div
      key={appt.id}
      className="group flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-4 rounded-2xl
                 bg-white/5 dark:bg-neutral-800/20 backdrop-blur-md
                 border border-white/10 hover:border-indigo-500/30
                 transition-all duration-300 gap-4"
    >
      <div className="flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-xl
                      bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-center">
        <span className="text-[10px] font-bold opacity-70">
          {formatAppointmentDate(appt.date).split(' ')[0]}
        </span>
        <span className="text-lg font-black">
          {formatAppointmentDate(appt.date).split(' ')[1]}
        </span>
      </div>

      <div className="shrink-0">
        <img
          src={avatarUrl(appt.professional)}
          alt={`${appt.professional.name} ${appt.professional.lastName}`}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/10"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-400 transition-colors">
          {appt.service.name}
        </h4>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-neutral-400">
          <span className="flex items-center gap-1">
            <User size={14} /> {appt.professional.name}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} /> {formatMinutes(appt.startMin)} - {formatMinutes(appt.endMin)}
          </span>
        </div>
      </div>

      <div className="sm:ml-auto mt-2 sm:mt-0">
        {(() => {
          const { text, color } = statusBadge(appt.status);
          return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${color}`}>
              {text}
            </span>
          );
        })()}
      </div>

      {!isHistory && (
        <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity pr-2">
          <ArrowRight size={18} className="text-indigo-500" />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-3 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Mis Citas
        </h1>

        <div className="flex p-1 bg-white/5 dark:bg-neutral-900/20 backdrop-blur-md rounded-2xl border border-white/10 w-auto">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "upcoming" ? "bg-indigo-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <CalendarCheck size={16} /> Próximas
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "history" ? "bg-indigo-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <History size={16} /> Historial
          </button>
        </div>
      </header>

      <main className="min-h-[400px]">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 w-full bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === "upcoming"
              ? upcoming.length > 0
                ? upcoming.map(a => renderAppointmentCard(a, false))
                : <EmptyState message="No tienes citas próximas." />
              : appointments.length > 0
                ? appointments.map(a => renderAppointmentCard(a, true))
                : <EmptyState message="Tu historial de citas está vacío." />
            }
          </div>
        )}
      </main>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-16 bg-white/5 dark:bg-neutral-900/10 border border-dashed border-white/10 rounded-2xl">
    <Calendar size={48} className="mx-auto text-neutral-500 mb-3 opacity-20" />
    <p className="text-neutral-400 font-medium">{message}</p>
  </div>
);

export default ClientAppointments;
