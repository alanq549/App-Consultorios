import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { staticbackend } from "@/config/variables";

import { useServices } from "@/hooks/Services/useServices";
import { useCreateAppointment } from "@/hooks/appointments/useCreateAppointment";
import type { BookingProfessional } from "@/types/professional.type";
import type { Service } from "@/types/service.type";

import { DateTimeSelector } from "./DateTimeSelector";
import { ServiceSelector } from "./ServiceSelector";
import toast from "react-hot-toast";

interface Props {
  professional: BookingProfessional;
  onClose: () => void;
}

const minutesToTime = (min: number) => {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

export function BookingFlowModal({ professional, onClose }: Props) {
  const { data: services, isLoading } = useServices(professional.id);
  const { mutate, isPending } = useCreateAppointment();

  const servicesList: Service[] = services ?? [];

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dateTime, setDateTime] = useState<{ date: string; startMin: number; endMin: number } | null>(null);

  const avatarUrl = professional.avatar
    ? `${staticbackend}${professional.avatar}`
    : "/imgs/image.png";

  // Step logic: 1 = service, 2 = date/time, 3 = confirm
  const step = !selectedService ? 1 : !dateTime ? 2 : 3;

  const steps = [
    { n: 1, label: "Servicio" },
    { n: 2, label: "Fecha y hora" },
    { n: 3, label: "Confirmar" },
  ];

  const handleConfirm = () => {
    if (!selectedService || !dateTime) return;
    mutate(
      {
        professionalProfileId: professional.id,
        serviceId: selectedService.id,
        date: dateTime.date,
        startMin: dateTime.startMin,
      },
      {
        onSuccess: () => {
          toast.success(`Listo ✔ Tu cita con ${professional.name} ${professional.lastName} fue agendada`);
          onClose();
        },

        onError: (error) => {
          toast.error("No se pudo agendar la cita");
          console.error(error);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl
      overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:dark:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400/60 [&::-webkit-scrollbar-thumb]:dark:hover:bg-blue-500/40 [&::-webkit-scrollbar-thumb]:transition-colors">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-white/30 dark:border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt={professional.name}
              className="w-9 h-9 rounded-xl object-cover border-2 border-indigo-500/50"
            />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Reservando con</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {professional.name} {professional.lastName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* STEP INDICATORS */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${step > s.n
                        ? "bg-indigo-600 text-white"
                        : step === s.n
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/40"
                          : "bg-white/40 dark:bg-white/10 text-gray-400 border border-white/40 dark:border-white/10"
                      }
                    `}
                  >
                    {step > s.n ? <Check size={13} /> : s.n}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${step >= s.n ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${step > s.n ? "bg-indigo-600" : "bg-gray-200/60 dark:bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 pb-6">

          {/* STEP 1: SERVICE */}
          {step === 1 && (
            isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/40 dark:bg-white/[0.04] border border-white/30 dark:border-white/10 animate-pulse" />
                ))}
              </div>
            ) : (
              <ServiceSelector services={servicesList} onSelect={setSelectedService} />
            )
          )}

          {/* STEP 2: DATE & TIME */}
          {step === 2 && selectedService && (
            <div className="space-y-4">
              {/* Selected service recap */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-200/40 dark:border-indigo-700/30">
                <div>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold uppercase tracking-wide">Servicio</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedService.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">${selectedService.price}</p>
                  <p className="text-xs text-gray-500">{selectedService.durationMin} min</p>
                </div>
              </div>

              <DateTimeSelector
                professionalId={professional.id}
                service={selectedService}
                onSelect={(date, startMin, endMin) => setDateTime({ date, startMin, endMin })}
              />

              <button
                onClick={() => setSelectedService(null)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronLeft size={13} /> Cambiar servicio
              </button>
            </div>
          )}

          {/* STEP 3: CONFIRM */}
          {step === 3 && selectedService && dateTime && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumen de tu cita</p>

              <div className="rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-white/30 dark:border-white/10 overflow-hidden">
                {[
                  { label: "Profesional", value: `${professional.name} ${professional.lastName}` },
                  { label: "Servicio", value: selectedService.name },
                  { label: "Duración", value: `${selectedService.durationMin} min` },
                  { label: "Precio", value: `$${selectedService.price}` },
                  { label: "Fecha", value: dateTime.date },
                  { label: "Hora", value: `${minutesToTime(dateTime.startMin)} – ${minutesToTime(dateTime.endMin)}` },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={`flex justify-between items-center px-4 py-3 ${i < arr.length - 1 ? "border-b border-white/20 dark:border-white/[0.07]" : ""}`}
                  >
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Confirmando..." : "Confirmar cita"}
              </button>

              <button
                onClick={() => setDateTime(null)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mx-auto"
              >
                <ChevronLeft size={13} /> Cambiar horario
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}