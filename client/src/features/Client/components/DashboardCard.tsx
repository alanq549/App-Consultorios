// 📄 DashboardCard.tsx (Clínico / Moderno)

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

const DashboardCard = ({ title, value, icon }: DashboardCardProps) => {
  return (
    <div
      className="
        p-6 rounded-2xl
        bg-white/60 dark:bg-neutral-900/30 dark:hover:bg-teal-900/10
        backdrop-blur-md
        border border-white/40 dark:border-white/10 dark:hover:border-teal-400/20
        shadow-lg shadow-black/5 dark:shadow-black/30
        transition-all hover:translate-y-[-2px]
        flex flex-col gap-4
      "
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl text-teal-500">{icon}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {title}
        </span>
      </div>

      <div className="text-4xl font-semibold text-neutral-900 dark:text-white">
        {value}
      </div>
    </div>
  );
};

export default DashboardCard;
