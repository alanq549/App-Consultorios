import { Clock, Check, X } from "lucide-react";
import { useUpdateAppointmentStatus } from "@/hooks/appointments/useUpdateAppointmentStatus";
import type { AppointmentResponseDTO } from "@/types/appointments.types";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";

interface Props {
  appointment: AppointmentResponseDTO;
}

export function AppointmentCard({ appointment }: Props) {
  const updateStatus = useUpdateAppointmentStatus();

  const handleConfirm = () => {
    updateStatus.mutate({
      appointmentId: appointment.id,
      status: "CONFIRMED",
    });
  };

  const handleCancel = () => {
    updateStatus.mutate({
      appointmentId: appointment.id,
      status: "CANCELLED",
    });
  };

  // Formateo de minutos a HH:mm
  const formatTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  // Lógica de fecha para el widget lateral
  const dateObj = new Date(appointment.date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");

  const clientName = appointment.client
    ? `${appointment.client.name} ${appointment.client.lastName ?? ""}`
    : (appointment.guest?.name ?? "Invitado");

return (
  <div className="group relative overflow-hidden bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md rounded-[2rem] border border-white/60 dark:border-white/10 p-4 transition-all duration-300 hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
    
    <div className="flex items-center gap-5">
      
      {/* FECHA ESTILO MINIMALISTA */}
      <div className="flex flex-col items-center justify-center min-w-[56px] h-[56px] rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group-hover:border-blue-500/30 transition-colors">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-neutral-500">{month}</span>
        <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{day}</span>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-black text-slate-800 dark:text-white truncate tracking-tight">
            {clientName}
          </h3>
          <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-neutral-600" />
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
            {appointment.service.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-neutral-400">
            <Clock size={12} className="text-slate-400" />
            {formatTime(appointment.startMin)} — {formatTime(appointment.endMin)}
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>
      </div>

      {/* ACCIONES - Aparecen al hacer hover para limpieza visual */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
        {appointment.status === "PENDING" && (
          <button 
            onClick={handleConfirm}
            disabled={updateStatus.isPending}
            className="w-9 h-9 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-90"
          >
            <Check size={16} strokeWidth={3} />
          </button>
        )}
        
        <button 
          onClick={handleCancel}
          disabled={updateStatus.isPending}
          className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-90"
        >
          <X size={16} strokeWidth={3} />
        </button>
      </div>
    </div>
  </div>
);
}