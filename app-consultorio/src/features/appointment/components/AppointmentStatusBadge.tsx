import type {AppointmentStatus} from "@/types/appointments.types"
interface Props {
  status: AppointmentStatus
  ;
}

export function AppointmentStatusBadge({ status }: Props) {
  const configs = {
    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    CONFIRMED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };

  const labels = { PENDING: "Pendiente", CONFIRMED: "Confirmada", CANCELLED: "Cancelada", COMPLETED: "Finalizada" };
  const style = configs[status as keyof typeof configs] || configs.PENDING;

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}