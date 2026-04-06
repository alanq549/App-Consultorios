// src/features/appointments/pages/ProfessionalAppointmentsPage.tsx
import { useState } from "react";
import { 
  Calendar, 
  History as HistoryIcon, 
  Plus, 
  CalendarCheck,
  SearchX 
} from "lucide-react";

import {
  useUpcomingAppointments,
  useAppointmentsHistory,
} from "@/hooks/appointments/useAppointments";
import { useCreateGuestAppointment } from "@/hooks/appointments/useCreateGuestAppointment";
import { useAppSelector } from "@/hooks/auth/useRedux";

import { AppointmentList } from "../components/AppointmentList";
import { AppointmentFilters } from "../components/AppointmentFilters";
import { GuestAppointmentForm } from "../components/GuestAppointmentForm";

import type { RootState } from "@/store";
import type { CreateGuestAppointmentDTO } from "@/types/appointments.types";

export function ProfessionalAppointmentsPage() {
  const user = useAppSelector((state: RootState) => state.auth.user);
  const professionalProfileId = user?.profile?.id;

  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");

  const { data: upcoming = [], isLoading: loadingUpcoming } = useUpcomingAppointments();
  const { data: history = [], isLoading: loadingHistory } = useAppointmentsHistory();

  const createGuestAppointment = useCreateGuestAppointment();

  const handleCreateGuest = (data: CreateGuestAppointmentDTO) => {
    createGuestAppointment.mutate(data, {
      onSuccess: () => setShowForm(false),
    });
  };

  // Filtrado dinámico según el tab activo
  const filteredData = (activeTab === "upcoming" ? upcoming : history).filter((a) =>
    statusFilter ? a.status === statusFilter : true
  );

  const isLoading = activeTab === "upcoming" ? loadingUpcoming : loadingHistory;

  if (!professionalProfileId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <SearchX size={48} className="mb-4 opacity-20" />
        <p className="font-black uppercase tracking-widest text-xs">No tienes perfil profesional</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* HEADER PRINCIPAL */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/40 dark:bg-neutral-900/40 p-6 sm:p-8 rounded-[2.5rem] border border-white/20 backdrop-blur-md gap-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter"> Mis citas</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* TABS SELECTOR (Igual al cliente) */}
          <div className="flex p-1.5 bg-slate-200/50 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "upcoming" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <CalendarCheck size={16} /> Próximas
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "history" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <HistoryIcon size={16} /> Historial
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex flex-1 lg:flex-none items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-black/10 dark:shadow-white/5"
          >
            <Plus size={18} strokeWidth={3} /> Nueva cita
          </button>
        </div>
      </header>

      {/* FILTROS DINÁMICOS */}
      <div className="flex justify-center sm:justify-start px-2">
        <AppointmentFilters
          status={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="min-h-[500px]">
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 w-full bg-white/20 dark:bg-white/5 animate-pulse rounded-[2rem] border border-white/10" />
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredData.length > 0 ? (
              <AppointmentList appointments={filteredData} />
            ) : (
              <EmptyState 
                message={activeTab === "upcoming" ? "No hay citas programadas" : "El historial está vacío"} 
              />
            )}
          </div>
        )}
      </main>

      {/* MODAL (Glassmorphism) */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/20 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6 tracking-tighter">
              Agendar Invitado
            </h2>

            <GuestAppointmentForm
              professionalProfileId={professionalProfileId}
              serviceId={1}
              onSubmit={handleCreateGuest}
            />

            <button
              onClick={() => setShowForm(false)}
              className="mt-6 w-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-500 transition-colors py-2"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente EmptyState auxiliar para congruencia
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-20 bg-white/20 dark:bg-neutral-900/20 border border-dashed border-white/20 rounded-[3rem]">
    <Calendar size={48} className="text-slate-300 dark:text-neutral-700 mb-4 opacity-50" />
    <p className="text-slate-500 dark:text-neutral-400 font-bold text-sm tracking-tight">{message}</p>
  </div>
);