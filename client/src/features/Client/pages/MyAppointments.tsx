import { useMyClientAppointments } from "@/features/appointments/appointmentsHooks";
import AppointmentCard from "@/features/Client/components/AppointmentCard";
import { CalendarDays, PlusCircle } from "lucide-react"; // Opcional: lucide-react

export default function MyAppointmentsClient() {
  const { data: appointments, isLoading, isError } = useMyClientAppointments();

  if (isLoading) return <AppointmentsSkeleton />;

  if (isError) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
        <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
      </div>
      <p className="text-gray-600 dark:text-gray-400">Hubo un problema al cargar tus citas.</p>
      <button onClick={() => window.location.reload()} className="mt-4 text-blue-600 font-medium">Reintentar</button>
    </div>
  );

  if (!appointments || appointments.length === 0) return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl mt-8">
      <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tienes citas aún</h3>
      <p className="text-gray-500 mb-6">Parece que todavía no has agendado ningún servicio.</p>
      <button className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg transition-colors">
        <PlusCircle size={18} /> Agendar mi primera cita
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis Citas</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestiona tus próximas visitas y el historial.</p>
        </div>
        <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
          {appointments.length} Citas
        </span>
      </header>

      <div className="grid gap-4">
        {appointments.map((app) => (
          <AppointmentCard key={app.id} appointment={app} />
        ))}
      </div>
    </div>
  );
}

// Sub-componente de Carga (Skeleton)
function AppointmentsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-8" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800/50 rounded-xl mb-4" />
      ))}
    </div>
  );
}