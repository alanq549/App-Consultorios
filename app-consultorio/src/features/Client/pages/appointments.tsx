import { useState, useEffect } from "react";
import { getAppointmentsHistory, getUpcomingAppointments } from "@/api/appointment.api";
import type { AppointmentResponseDTO } from "@/types/appointments.types";
import { staticbackend } from "@/config/variables";
import { Clock, ArrowRight, History, CalendarCheck, SearchX } from "lucide-react";
import ReviewModal from "@/features/reviews/components/ReviewModal";
import { useReviewsByAppointments } from "@/hooks/reviews/useReviewsByAppointments";

export const ClientAppointments = () => {

  
  const [appointments, setAppointments] = useState<AppointmentResponseDTO[]>([]);
  const [upcoming, setUpcoming] = useState<AppointmentResponseDTO[]>([]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentResponseDTO | null>(null);
  useEffect(() => {
    Promise.all([getUpcomingAppointments(), getAppointmentsHistory()])
      .then(([upcomingData, historyData]) => {
        setUpcoming(upcomingData);
        setAppointments(historyData);
          console.log("citas: ", historyData)

      })
      .finally(() => setLoading(false));
  }, []);
    const appointmentIds = appointments.map(a => a.id);
  const { data: reviews } = useReviewsByAppointments(appointmentIds);

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const formatAppointmentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
    return { day, month };
  };

  

  const getStatusStyles = (status: string) => {
    const configs: Record<string, { text: string; color: string }> = {
      PENDING: { text: "Pendiente", color: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
      CONFIRMED: { text: "Confirmada", color: "bg-blue-500/10 border-blue-500/20 text-blue-500" },
      CANCELLED: { text: "Cancelada", color: "bg-red-500/10 border-red-500/20 text-red-500" },
      COMPLETED: { text: "Finalizada", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
    };
    return configs[status] || { text: status, color: "bg-slate-500/10 border-slate-500/20 text-slate-500" };
  };

  

  const avatarUrl = (professional: { avatar?: string | null }) =>
    professional.avatar ? `${staticbackend}${professional.avatar}` : "/imgs/image.png";

  const renderAppointmentCard = (appt: AppointmentResponseDTO, isHistory: boolean) => {
    const { day, month } = formatAppointmentDate(appt.date);
    const status = getStatusStyles(appt.status);


const review = reviews?.find(r => r.appointmentId === appt.id);

    return (
      <div
        key={appt.id}
        className="group relative flex items-center gap-5 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md rounded-[2rem] border border-white/60 dark:border-white/10 p-4 transition-all duration-300 hover:bg-white/70 dark:hover:bg-neutral-800/60 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]"
      >
        {/* FECHA ESTILO "TICKET" */}
        <div className="flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group-hover:border-blue-500/30 transition-colors">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-500 leading-none mb-1">{month}</span>
          <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{day}</span>
        </div>

        {/* AVATAR CON INDICADOR DE ESTADO INTEGRADO */}
        <div className="relative shrink-0 hidden sm:block">
          <img
            src={avatarUrl(appt.professional)}
            alt={appt.professional.name}
            className="w-12 h-12 rounded-2xl object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"
          />
          {/* Un pequeño detalle: punto de estado sobre el avatar */}
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900 ${status.color.split(' ')[0]}`} />
        </div>

        {/* INFO DEL SERVICIO */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-black text-slate-800 dark:text-white truncate tracking-tight uppercase">
              {appt.service.name}
            </h4>
            {!isHistory && (
              <span className="flex items-center gap-1 text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                Próxima
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
              {appt.professional.name}
            </span>
            <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-neutral-700" />
            <span className="flex items-center gap-1">
              <Clock size={12} className="opacity-50" />
              {formatMinutes(appt.startMin)}
            </span>
          </div>
        </div>

        {/* ESTADO O ACCIÓN */}
        <div className="flex flex-col items-end gap-1">
          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border ${status.color}`}>
            {status.text}
            
           
          </span>
          {isHistory && appt.status === "COMPLETED" && !review && (
  <button
    onClick={() => setSelectedAppointment(appt)}
    className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-600 transition"
  >
    Dejar reseña
  </button>
)}
        </div>

        {/* FLECHA SUTIL */}
        {!isHistory && (
          <div className="pl-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 hidden lg:block">
            <ArrowRight size={18} className="text-blue-500" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-6 animate-in fade-in duration-700">

      {/* HEADER GLASS */}
      <header className="flex flex-col sm:flex-row items-center justify-between bg-white/40 dark:bg-neutral-900/40 p-8 rounded-[3rem] border border-white/20 backdrop-blur-md gap-6 shadow-sm">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Mis Citas</h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Panel de Control</p>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex p-1.5 bg-slate-200/50 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "upcoming"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
          >
            <CalendarCheck size={16} /> Próximas
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "history"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
          >
            <History size={16} /> Historial
          </button>
        </div>
      </header>

      {/* LISTADO */}
      <main className="min-h-[450px]">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 w-full bg-white/20 dark:bg-white/5 animate-pulse rounded-[2.5rem]" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {(activeTab === "upcoming" ? upcoming : appointments).length > 0 ? (
              (activeTab === "upcoming" ? upcoming : appointments).map(a =>
                renderAppointmentCard(a, activeTab === "history")
              )
            ) : (
              <EmptyState message={activeTab === "upcoming" ? "No tienes citas próximas." : "Tu historial está vacío."} />
            )}
          </div>
        )}
      </main>
      {selectedAppointment && (
  <ReviewModal
    appointmentId={selectedAppointment.id}
    professionalName={selectedAppointment.professional.name}
    onClose={() => setSelectedAppointment(null)}
  />
)}
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-24 bg-white/10 dark:bg-neutral-900/10 border border-dashed border-white/20 rounded-[3rem] text-center">
    <SearchX size={48} className="text-slate-400 mb-4 opacity-20" />
    <p className="text-slate-500 dark:text-neutral-400 font-black uppercase tracking-widest text-[10px]">{message}</p>
  </div>
);

export default ClientAppointments;