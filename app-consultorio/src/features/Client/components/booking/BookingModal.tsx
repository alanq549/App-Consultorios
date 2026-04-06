// src/features/Client/components/booking/BookingModal.tsx
import { useState } from "react";
import { ServiceSelector } from "./ServiceSelector";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { createAppointment } from "@/api/appointment.api";
import { staticbackend } from "@/config/variables";
import type { Service } from "@/types/service.type";
import type { Professional } from "@/types/professional.type";
import { RatingStars } from "@/components/ui/RatingStars";
import {
  CalendarIcon,
  CalendarPlus,
  Check,
  Clock,
  Stethoscope,
  X,
} from "lucide-react";
import { DatePicker } from "./DatePicker";

type Slot = {
  startMin: number;
  endMin: number;
};

type Props = {
  professional: Professional;
  onClose: () => void;
};

export function BookingModal({ professional, onClose }: Props) {
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);

  const avatarUrl = professional.avatar
    ? `${staticbackend}${professional.avatar}`
    : "/imgs/image.png";

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60)
      .toString()
      .padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  let step = 1;
  if (service) step = 2;
  if (service && date) step = 3;
  if (service && date && slot) step = 4;
  const stepTitle =
    step === 1
      ? "Elige un servicio"
      : step === 2
        ? "Selecciona una fecha"
        : step === 3
          ? "Elige un horario"
          : "Resumen de tu cita";


  const handleConfirm = async () => {
    if (!service || !date || !slot) return;
    await createAppointment({
      professionalProfileId: professional.id,
      serviceId: service.id,
      date,
      startMin: slot.startMin,
    });
    alert("Cita creada 🎉");
    onClose();
  };

  console.log(
    "step:",
    step,
    "service:",
    service?.name,
    "date:",
    date,
    "slot:",
    slot,
  );
  console.log("slot value:", slot);
  console.log("slot type:", typeof slot);
  console.log("SERVICE OBJECT:", service);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300">
        {/* HEADER */}
        <div className="px-8 py-5 border-b border-white/20 dark:border-white/5 flex items-center justify-between bg-white/30 dark:bg-neutral-800/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white">
              <CalendarPlus size={20} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                Agendar cita
              </h2>
              <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">
                {stepTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* PROGRESS */}
        <div className="px-8 pt-4 pb-0">
          <div className="flex items-center gap-2 mb-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="flex items-center gap-2 flex-1 last:flex-none"
              >
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-black transition-all duration-300 ${
                    s < step
                      ? "bg-blue-600 text-white"
                      : s === step
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110"
                        : "bg-slate-100 dark:bg-white/5 text-slate-400"
                  }`}
                >
                  {s < step ? <Check size={10} strokeWidth={3} /> : s}
                </div>
                {s < 4 && (
                  <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: s < step ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mb-4">
            {["Servicio", "Fecha", "Horario", "Confirmar"].map((label, i) => (
              <span
                key={label}
                className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                  i + 1 === step
                    ? "text-blue-600 dark:text-blue-400"
                    : i + 1 < step
                      ? "text-slate-400"
                      : "text-slate-300 dark:text-neutral-600"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:dark:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400/60">
          {step < 4 ? (
            <div className="flex flex-col md:flex-row gap-0">
              {/* SIDEBAR */}
              <aside className="md:w-64 flex-shrink-0 p-6 border-b md:border-b-0 md:border-r border-white/20 dark:border-white/5 bg-white/20 dark:bg-white/[0.02] space-y-5">
                {/* PROFESIONAL */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="relative">
                    <img
                      src={avatarUrl}
                      alt={professional.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/60 dark:border-white/10 shadow-lg"
                    />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 dark:text-white tracking-tight text-sm">
                      {professional.name} {professional.lastName}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-0.5">
                      {professional.specialties?.length
                        ? professional.specialties.map((s) => s.name).join(", ")
                        : "Especialista"}
                    </p>
                  </div>
                  <RatingStars rating={professional.ratingAvg} />
                </div>

                {/* RESUMEN */}
                <div className="space-y-2 pt-4 border-t border-white/20 dark:border-white/5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Resumen
                  </p>

                  {[
                    { label: "Servicio", value: service?.name },
                    {
                      label: "Duración",
                      value: service ? `${service.durationMin} min` : undefined,
                    },
                    { label: "Fecha", value: date || undefined },
                    {
                      label: "Horario",
                      value: slot
                        ? `${formatMinutes(slot.startMin)} – ${formatMinutes(slot.endMin)}`
                        : undefined,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                        value
                          ? "bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10"
                          : "bg-white/20 dark:bg-white/[0.02] border border-dashed border-white/20 dark:border-white/5"
                      }`}
                    >
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {label}
                      </span>
                      {value ? (
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 text-right max-w-[100px] truncate">
                          {value}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 dark:text-neutral-600 italic">
                          —
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              {/* CONTENIDO DEL PASO */}
              <section className="flex-1 p-6 md:p-8">
                {!service && (
                  <ServiceSelector
                    professionalId={professional.id}
                    onSelect={setService}
                    onClose={onClose}
                  />
                )}

               {service && !date && (
  <div className="max-w-xs mx-auto">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-6 text-center">
      Selecciona una fecha
    </label>
    
    <DatePicker 
      value={date} 
      onChange={(newDate) => {
        setDate(newDate);
        setSlot(null);
      }} 
    />

    <button
      onClick={() => setService(null)}
      className="w-full mt-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
    >
      ← Volver a servicios
    </button>
  </div>
)}

                {service && date && !slot && (
                  <TimeSlotPicker
                    professionalId={professional.id}
                    serviceId={service.id}
                    date={date}
                    onSelect={setSlot}
                    onBack={() => {
                      setService(null);
                      setDate("");
                      setSlot(null);
                    }}
                  />
                )}
              </section>
            </div>
          ) : (
            /* PASO 4 — CONFIRMACIÓN */
            <div className="p-6 md:p-10 animate-in fade-in zoom-in-95 duration-300">
              <div className="max-w-md mx-auto space-y-6">
                {/* AVATAR + NOMBRE */}
                <div className="flex flex-col items-center gap-3 pb-6 border-b border-white/20 dark:border-white/5">
                  <div className="relative">
                    <img
                      src={avatarUrl}
                      alt={professional.name}
                      className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-white/60 dark:border-white/10 shadow-xl"
                    />
                    {professional.verificationStatus === "APPROVED" && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <Check
                          size={12}
                          strokeWidth={3}
                          className="text-white"
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight">
                      {professional.name} {professional.lastName}
                    </p>
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">
                      {professional.specialties?.[0]?.name ?? "Especialista"}
                    </p>
                  </div>
                </div>

                {/* DETALLE DE LA CITA */}
                <div className="space-y-2">
                  {[
                    {
                      icon: Stethoscope,
                      label: "Servicio",
                      value: service?.name,
                    },
                    {
                      icon: Clock,
                      label: "Duración",
                      value: service ? `${service.durationMin} minutos` : "",
                    },
                    { icon: CalendarIcon, label: "Fecha", value: date },
                    {
                      icon: Clock,
                      label: "Horario",
                      value: slot
                        ? `${formatMinutes(slot.startMin)} – ${formatMinutes(slot.endMin)}`
                        : "",
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10"
                    >
                      <div className="p-2 bg-blue-600/10 dark:bg-blue-500/10 rounded-xl">
                        <Icon
                          size={16}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {label}
                        </p>
                        <p className="text-sm font-black text-slate-800 dark:text-white truncate">
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ACCIONES */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSlot(null)}
                    className="flex-1 px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    <Check size={16} strokeWidth={3} />
                    Confirmar cita
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
