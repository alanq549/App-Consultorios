// 📄 DashboardClient.tsx (Clínico / Moderno)
import DashboardCard from "../components/DashboardCard";
import {
  FaCalendarCheck,
  FaHistory,
  FaCreditCard,
  
  FaEnvelope,
  FaBell,
  FaCalendarAlt,
  FaAngleRight,
} from "react-icons/fa";

const DashboardClient = () => {
  return (
  <div className="space-y-10 ">
  {/* Header */}
  <header className="space-y-2">
    <h1 className="text-3xl font-semibold">Bienvenido, Alan</h1>
    <p className="text-gray-600 dark:text-gray-300">
      Aquí puedes consultar tus próximas citas y notificaciones.
    </p>
  </header>

  {/* Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <DashboardCard title="Próxima cita" value="Lunes · 15:00" icon={<FaCalendarCheck />} />
    <DashboardCard title="Citas realizadas" value={9} icon={<FaHistory />} />
    <DashboardCard title="Pagos pendientes" value="$45.00" icon={<FaCreditCard />} />
    <DashboardCard title="Mensajes" value={3} icon={<FaEnvelope />} />
    <DashboardCard title="Recordatorios" value={1} icon={<FaBell />} />
  </div>

  {/* CTA / Próxima acción */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-md flex flex-col">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <FaCalendarAlt className="text-teal-500"/> Agendar nueva cita
      </h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Programa tu próxima consulta médica de manera rápida y sencilla.
      </p>
      <button className="mt-auto px-5 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl transition-colors flex items-center gap-2">
        Agendar cita <FaAngleRight />
      </button>
    </div>

    {/* Historial resumido */}
    <div className="p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Próximas citas
      </h3>
      <ul className="space-y-3">
        <li className="p-3 rounded-lg bg-white/40 dark:bg-zinc-800/30 flex justify-between items-center">
          <div>
            <p className="font-medium">15 Dic · 15:00</p>
            <p className="text-sm text-gray-500">Dr. Smith</p>
          </div>
          <span className="text-teal-600 dark:text-teal-400 text-sm font-medium">Confirmada</span>
        </li>
        <li className="p-3 rounded-lg bg-white/40 dark:bg-zinc-800/30 flex justify-between items-center">
          <div>
            <p className="font-medium">22 Dic · 10:00</p>
            <p className="text-sm text-gray-500">Dra. Pérez</p>
          </div>
          <span className="text-gray-500 text-sm font-medium">Pendiente</span>
        </li>
      </ul>
    </div>
  </div>
</div>
  );
};

export default DashboardClient;
