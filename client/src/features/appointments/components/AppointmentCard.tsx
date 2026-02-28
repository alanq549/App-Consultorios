import type { Appointment } from "../types";

export default function AppointmentCard({ cita }: { cita: Appointment }) {
  const date = new Date(cita.dateTimeLocal);
  const hour = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-blue-100 rounded p-2 shadow-sm text-xs cursor-pointer hover:bg-blue-200">
      <p className="font-bold">{cita.client?.name ?? "Invitado"}</p>
      <p>{cita.service.name}</p>
      <p className="text-gray-600">{hour}</p>
      <p className="italic text-gray-500 text-[10px]">{cita.status}</p>
    </div>
  );
}
