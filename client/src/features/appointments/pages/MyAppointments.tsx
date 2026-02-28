import { useMyAppointments } from "@/features/appointments/appointmentsHooks";
import AppointmentList from "@/features/appointments/components/AppointmentList";

export default function AppointmentsPage() {
  const { data, isLoading, error } = useMyAppointments();

  if (isLoading) return <p>Cargando citas...</p>;
  if (error) return <p>Error al cargar citas.</p>;
  if (!data || data.length === 0) return <p>No hay citas programadas.</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Mis Citas</h2>
      <AppointmentList appointments={data} />
    </div>
  );
}
