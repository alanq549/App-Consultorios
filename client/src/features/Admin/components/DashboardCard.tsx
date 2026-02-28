interface DashboardCardProps {
  title: string;
  value: string | number;
    icon?: React.ReactNode; // 👈 Esto debe ser React.ReactNode, no string

}

const DashboardCard = ({ title, value, icon }: DashboardCardProps) => {
  return (
    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-2xl font-bold mt-2 text-teal-600 dark:text-teal-300">{value}</div>
    </div>
  );
};

export default DashboardCard;
