import DashboardCard from "../components/DashboardCard";
import { useProfessionalStats } from "@/features/professionals/professionalHooks";

const DashboardProfessional = () => {
  const { data: stats, isLoading, error } = useProfessionalStats();

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar estadísticas</p>;

  return (
    <div className="dashboard-container p-4 space-y-6">
      <h1 className="text-2xl font-bold">Bienvenido/a al Dashboard Profesional</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Aquí puedes ver un resumen de tu actividad como profesional de salud.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard title="Citas Hoy" value={stats.citasHoy} icon="📅" />
        <DashboardCard title="Pacientes Activos" value={stats.pacientesActivos} icon="🧑‍⚕️" />
        <DashboardCard title="Ingresos Mensuales" value={`$${stats.ingresosMensuales}`} icon="💰" />
        <DashboardCard title="Reseñas" value={`${stats.reseñas} / 5`} icon="⭐" />
        <DashboardCard title="Servicios Disponibles" value={stats.servicios} icon="🛠️" />
        <DashboardCard title="Notificaciones" value={stats.notificaciones} icon="🔔" />
      </div>
    </div>
  );
};

export default DashboardProfessional;
