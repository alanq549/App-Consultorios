import DashboardCard from "../components/DashboardCard";
import { useAdminStats } from "@/features/Admin/admin.hooks";
import { FaUser, FaUserTie, FaUsers, FaBriefcase, FaCalendarCheck } from "react-icons/fa";

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) return <p>Cargando datos...</p>;
  if (error) return <p>Error al cargar las estadísticas.</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Panel de Administración</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <DashboardCard title="Total Usuarios" value={stats?.totalUsers ?? 0} icon={<FaUsers />} />
        <DashboardCard title="Profesionales" value={stats?.totalProfessionals ?? 0} icon={<FaUserTie />} />
        <DashboardCard title="Clientes" value={stats?.totalClients ?? 0} icon={<FaUser />} />
        <DashboardCard title="Especialidades" value={stats?.totalSpecialties ?? 0} icon={<FaBriefcase />} />
        <DashboardCard title="Citas" value={stats?.totalAppointments ?? 0} icon={<FaCalendarCheck />} />
      </div>
    </div>
  );
}
