import { useState } from "react";
import type { CreateGuestAppointmentDTO } from "@/types/appointments.types";
import { CalendarIcon, Clock, FileText, Info, Mail, Phone, Plus, User } from "lucide-react";

interface Props {
  professionalProfileId: number;
  serviceId: number;
  onSubmit: (data: CreateGuestAppointmentDTO) => void;
}

export function GuestAppointmentForm({
  professionalProfileId,
  serviceId,
  onSubmit,
}: Props) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [date, setDate] = useState("");
  const [startMin, setStartMin] = useState(540);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      professionalProfileId,
      serviceId,
      date,
      startMin,
      notes,
      guestName,
      guestEmail,
      guestPhone,
    });
  };

return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* SECCIÓN: INFORMACIÓN PERSONAL */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase ml-1 tracking-[0.2em]">
          Datos del Invitado
        </label>
        
        <div className="grid grid-cols-1 gap-4">
          {/* Nombre */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <User size={18} />
            </div>
            <input
              type="text"
              placeholder="Nombre completo"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-700 dark:text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-400/60"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-700 dark:text-neutral-200 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-400/60"
              />
            </div>
            {/* Teléfono */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                placeholder="Teléfono"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-700 dark:text-neutral-200 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-400/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN: FECHA Y HORA */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase ml-1 tracking-widest">
            Fecha
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
              <CalendarIcon size={16} />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-700 dark:text-neutral-200 outline-none cursor-pointer"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase ml-1 tracking-widest">
            Minuto de inicio
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
              <Clock size={16} />
            </div>
            <input
              type="number"
              value={startMin}
              onChange={(e) => setStartMin(Number(e.target.value))}
              className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-700 dark:text-neutral-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN: NOTAS */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase ml-1 tracking-widest">
          Notas adicionales
        </label>
        <div className="relative">
          <div className="absolute left-4 top-5 text-slate-400">
            <FileText size={16} />
          </div>
          <textarea
            placeholder="Motivo de la consulta o detalles..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 dark:text-neutral-200 outline-none focus:border-blue-500/50 transition-all resize-none placeholder:text-slate-400/60"
          />
        </div>
      </div>

      {/* BANNER INFORMATIVO */}
      <div className="bg-blue-600/5 dark:bg-blue-400/5 border border-blue-200/20 p-4 rounded-2xl flex gap-3 items-center">
        <Info size={16} className="text-blue-500 shrink-0" />
        <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-bold leading-tight">
          Esta cita se registrará manualmente y no requiere confirmación del paciente.
        </p>
      </div>

      {/* BOTÓN DE ACCIÓN */}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 group"
      >
        <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
        Crear cita manual
      </button>
    </form>
  );
}