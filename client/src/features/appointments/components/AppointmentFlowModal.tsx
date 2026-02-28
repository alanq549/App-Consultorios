import { useState } from "react";
import OverlayPortal from "@/components/portals/OverlayPortal";
import type { Professional as BaseProfessional } from "@/features/professionals/components/ProfessionalCard";
import StepSelectSchedule from "../steps/StepSelectSchedule";
import StepConfirmAppointment from "../steps/StepConfirmAppointment";
import { useCreateAppointment } from "../appointmentsHooks";
import { useAppSelector } from "@/hooks/redux";
import StepSelectService, { type Service } from "../steps/StepSelectService";
import type { Schedule } from "../steps/StepSelectSchedule";

type Props = {
  professional: ProfessionalWithSchedule;
  onClose: () => void;
};

export type ProfessionalWithSchedule = BaseProfessional & {
  services?: Service[];
  schedules?: Schedule[];
};

const staticUrl = import.meta.env.VITE_STATIC_URL;

export default function AppointmentFlowModal({
  professional,
  onClose,
}: Props) {
  const user = useAppSelector((state) => state.auth.user);

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const { mutate: createAppointment } = useCreateAppointment();

  const handleConfirm = () => {
    if (!selectedServiceId || !selectedDate || !selectedTime) return;

    createAppointment(
      {
        serviceId: selectedServiceId,
        professionalId: professional.user.id,
        date: selectedDate,
        startTime: selectedTime,
        notes: "",
      },
      {
        onSuccess: () => setIsConfirmed(true),
        onError: (err: Error) =>
          alert("Error al crear la cita: " + err.message),
      }
    );
  };

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-800/40 rounded-2xl border dark:border-white/20 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative">

          {/* HEADER */}
          <header className="p-6 border-b border-gray-200 dark:border-zinc-700">
            <div className="flex items-start gap-4">
              <img
                src={`${staticUrl}${professional.user.avatar}` || "/default-avatar.png"}
                alt={`${professional.user.name} ${professional.user.lastName}`}
                className="w-20 h-20 rounded-full object-cover border-4 border-teal-500 shadow-md"
              />

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {professional.user.name} {professional.user.lastName}
                    </h3>
                    <p className="text-teal-500 font-medium">
                      {professional.specialty?.name ?? "Especialidad"}
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition"
                    aria-label="Cerrar modal"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* BODY */}
          <main className="flex-1 overflow-y-auto p-6">
            {!selectedServiceId && (
              <StepSelectService
                services={professional.services || []}
                selectedServiceId={selectedServiceId ?? undefined}
                onSelectService={setSelectedServiceId}
              />
            )}

            {selectedServiceId && (!selectedDate || !selectedTime) && (
              <StepSelectSchedule
                schedules={professional.schedules || []}
                onSelectSchedule={(date, time) => {
                  setSelectedDate(date);
                  setSelectedTime(time);
                }}
              />
            )}

            {selectedServiceId &&
              selectedDate &&
              selectedTime &&
              !isConfirmed && (
                <StepConfirmAppointment
                  clientName={
                    user
                      ? `${user.name} ${user.lastName ?? ""}`
                      : "Cliente"
                  }
                  specialtyName={professional.specialty?.name ?? ""}
                  professionalName={`${professional.user.name} ${professional.user.lastName}`}
                  selectedSchedule={`${selectedDate} ${selectedTime}`}
                  onConfirm={handleConfirm}
                />
              )}

            {isConfirmed && (
              <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                  ✓
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  ¡Cita confirmada!
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Te enviamos los detalles por correo.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                >
                  Cerrar
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </OverlayPortal>
  );
}
