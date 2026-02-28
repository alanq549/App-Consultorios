import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Appointment } from "../types";
import { useUpdateAppointmentStatus } from "../appointmentsHooks";

interface Props {
  appointments: Appointment[];
}

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getDayIndex(dateStr: string) {
  const date = new Date(dateStr); // Esto ya es local
  // getDay() → 0=Dom, 6=Sáb
  return (date.getDay() + 6) % 7; // Mapea Lunes a 0, ..., Domingo a 6
}

const staticUrl = import.meta.env.VITE_STATIC_URL;

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-xl border border-neutral-200 dark:border-zinc-700">
        <h3 className="text-lg font-semibold mb-2 text-neutral-800 dark:text-zinc-100">
          {title}
        </h3>
        <p className="mb-4 text-neutral-600 dark:text-zinc-300">
          {description}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 dark:bg-zinc-700 text-neutral-800 dark:text-zinc-200 rounded-lg hover:bg-neutral-300 dark:hover:bg-zinc-600 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors ${
              title.includes("Confirmar") ? "bg-green-600" : "bg-red-600"
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Procesando...
              </span>
            ) : (
              "Confirmar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentList({ appointments }: Props) {
  const [modalState, setModalState] = useState<{
    open: boolean;
    appointmentId?: number;
    action?: "CONFIRMED" | "CANCELLED";
  }>({ open: false });

  const queryClient = useQueryClient();
  const mutation = useUpdateAppointmentStatus();

  const appointmentsByDay = daysOfWeek.map((_, i) =>
    appointments
      .filter((a) => getDayIndex(a.dateTimeLocal) === i)
      .sort(
        (a, b) =>
          new Date(a.dateTimeLocal).getTime() -
          new Date(b.dateTimeLocal).getTime()
      )
  );

  const handleOpenModal = (id: number, action: "CONFIRMED" | "CANCELLED") => {
    setModalState({ open: true, appointmentId: id, action });
  };


  new Date("2025-08-09 15:00").toString()  // puede dar "Fri Aug 09 2025 09:00:00 GMT-0600"
new Date("2025-08-09T15:00:00").toString() // da "Sat Aug 09 2025 15:00:00 GMT-0600"
  const handleConfirm = () => {
    if (!modalState.appointmentId || !modalState.action) return;
    mutation.mutate(
      { id: modalState.appointmentId, status: modalState.action },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["appointments", "client"],
          });
          setModalState({ open: false });
        },
        onError: () => {
          alert("Error actualizando el estado de la cita");
        },
      }
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-4 p-4 bg-neutral-50 dark:bg-zinc-900 rounded-lg">
        {daysOfWeek.map((day, i) => (
          <div
            key={day}
            className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-neutral-200 dark:border-zinc-700 flex flex-col min-h-[200px]"
            role="region"
            aria-label={`Citas para ${day}`}
          >
            <div className="text-center font-semibold text-neutral-800 dark:text-zinc-100 bg-neutral-100 dark:bg-zinc-700 py-2 rounded-t-lg border-b border-neutral-200 dark:border-zinc-600">
              {day}
            </div>
            <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-grow">
              {appointmentsByDay[i].length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-zinc-400 italic text-center mt-4">
                  Sin citas
                </p>
              ) : (
                appointmentsByDay[i].map((cita) => {
                  const date = new Date(cita.dateTimeLocal);
                  const hour = date.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const status = cita.status || "PENDING";
                  const duration = "30 min";

                  appointments.forEach((a) => {
                    const idx = getDayIndex(a.dateTimeLocal);
                    console.log(
                      `Cita ${a.id} - Fecha: ${a.dateTimeLocal} - getDayIndex: ${idx} (${daysOfWeek[idx]})`
                    );
                      // puede dar "Fri Aug 09 2025 09:00:00 GMT-0600"
console.log(new Date("2025-08-09 15:00").toString())
console.log(new Date("2025-08-09T15:00:00").toString())

                  });

                  return (
                    <div
                      key={cita.id}
                      className="group relative bg-teal-50 dark:bg-zinc-900/30 rounded-lg p-3 shadow-sm text-sm cursor-pointer transition-all duration-200 hover:bg-teal-100 dark:hover:bg-teal-800/40 dark:border dark:border-transparent  dark:hover:border-teal-400 hover:shadow-md"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex flex-col items-center text-center">
                        {cita.client?.avatar && (
                          <div className="mb-3">
                            <img
                              src={staticUrl + cita.client.avatar}
                              alt={cita.client.name}
                              className="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-zinc-700 shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/default-avatar.png";
                              }}
                            />
                          </div>
                        )}

                        <p className="font-semibold text-neutral-900 dark:text-zinc-100 truncate w-full">
                          {cita.client?.name ?? "Invitado"}
                        </p>
                        <p className="text-neutral-700 dark:text-zinc-300 truncate w-full">
                          {cita.service.name}
                        </p>

                        <p className="text-neutral-600 dark:text-zinc-400 text-xs mt-1">
                          {hour} • {duration}
                        </p>

                        <span
                          className={`mt-1 text-xs px-2 py-0.5 rounded-full ${
                            status === "CONFIRMED"
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : status === "CANCELLED"
                              ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          }`}
                        >
                          {status === "CONFIRMED"
                            ? "Confirmada"
                            : status === "CANCELLED"
                            ? "Cancelada"
                            : "Pendiente"}
                        </span>
                      </div>

                      {status === "PENDING" && (
                        <div className="mt-3 flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(cita.id, "CONFIRMED");
                            }}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(cita.id, "CANCELLED");
                            }}
                            className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={modalState.open}
        onClose={() => setModalState({ open: false })}
        onConfirm={handleConfirm}
        title={
          modalState.action === "CONFIRMED" ? "Confirmar cita" : "Cancelar cita"
        }
        description={`¿Estás seguro de que deseas ${
          modalState.action === "CONFIRMED" ? "confirmar" : "cancelar"
        } esta cita?`}
        isLoading={mutation.isPending}
      />
    </>
  );
}
