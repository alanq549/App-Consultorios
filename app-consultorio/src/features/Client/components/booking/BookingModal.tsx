import { useState } from "react";
import { ServiceSelector } from "./ServiceSelector";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { createAppointment } from "@/api/appointment.api";
import { staticbackend } from "@/config/variables";
import type { Service } from "@/types/service.type";

type Professional = {
  id: number;
  name: string;
  lastName: string;
  avatar?: string;
  isVerified: boolean;
  specialty?: {
    id: number;
    name: string;
  };
};

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

  const step = !service ? 1 : !date ? 2 : !slot ? 3 : 4;
  const stepTitle =
    step === 1
      ? "Elige un servicio"
      : step === 2
        ? "Selecciona una fecha"
        : step === 3
          ? "Elige un horario"
          : "Confirma tu cita";

  const progress = (step / 4) * 100;

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
  

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="
        w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6
        rounded-2xl
        bg-white/70 dark:bg-neutral-900/60
        backdrop-blur-xl
        border border-white/30 dark:border-white/10
        shadow-2xl
      "
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Agendar cita
          </h2>
          <button
            onClick={onClose}
            className="text-gray-950 dark:text-neutral-200 hover:text-red-600  dark:hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* PROGRESS BAR */}
        <div className="mb-5">
          <div className="h-2 bg-gray-200/60 dark:bg-neutral-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* SIDEBAR GLASS */}
          <aside
            className="
            w-full md:w-70
            p-4
            rounded-xl
            flex-shrink-0
            bg-white/40 dark:bg-neutral-800/40
            backdrop-blur-lg
            border border-white/30 dark:border-white/10
            shadow-lg
          "
          >
            <div className="flex flex-col items-center">
              <img
                src={avatarUrl}
                alt={professional.name}
                className="w-14 h-14 rounded-full object-cover"
              />
              <h2 className="mt-2">⭐ ⭐ ⭐ ⭐ ⭐</h2>
            </div>

            <div className="font-semibold text-gray-900 dark:text-gray-100 text-center mt-2">
              {professional.name} {professional.lastName}{" "}
              {professional.isVerified && "✔️"}
            </div>

            <div className="text-gray-500 dark:text-gray-300 mb-3 text-center">
              {professional.specialty?.name}
            </div>

            <p className="font-semibold mb-2 text-gray-700 dark:text-gray-200">
              Resumen de la cita
            </p>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>Servicio:</strong>{" "}
              <span className="text-gray-600 dark:text-neutral-300">
                {service ? service.name : "—"}
              </span>
            </p>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>Fecha:</strong>{" "}
              <span className="text-gray-600 dark:text-neutral-300">
                {date || "—"}
              </span>
            </p>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>Hora:</strong>{" "}
              <span className="text-gray-600 dark:text-neutral-300">
                {slot ? formatMinutes(slot.startMin) : "—"}
              </span>
            </p>
          </aside>

          {/* CONTENIDO */}
          <section className="flex-1">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">
              Paso {step} de 4
            </h3>

            <p className="text-gray-700 dark:text-gray-400 mb-4">{stepTitle}</p>

            {/* PASO 1 */}
            {!service && (
              <ServiceSelector
                professionalId={professional.id}
                onSelect={setService}
                onClose={onClose}
              />
            )}

            {/* PASO 2 */}
            {service && !date && (
              <div className="grid gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlot(null);
                  }}
                  className="
      w-full
      px-4 py-2.5
      rounded-lg
      border
      border-gray-300 dark:border-white/10
      bg-white dark:bg-white/[0.04]
      backdrop-blur-md
      text-gray-900 dark:text-gray-100
      shadow-sm
      transition-all duration-200
      hover:border-gray-400 dark:hover:border-white/20
      focus:outline-none
      focus:ring-2 focus:ring-indigo-500/70
      focus:border-indigo-500
    "
                />
              </div>
            )}

            {/* PASO 3 */}
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

            {/* PASO 4 */}
            {slot && (
              <button
                onClick={handleConfirm}
                className="
                mt-5 w-full py-3
                bg-indigo-600 hover:bg-indigo-700
                text-white font-semibold
                rounded-lg
                transition-colors
                shadow-md
              "
              >
                Confirmar cita
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
