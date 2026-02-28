// layouts/components/Topbar.tsx
import { NavLink } from "react-router-dom";
import { useAppSelector } from "@/hooks/auth/useRedux";
import { UserMenu } from "./UserMenu";
import { LayoutDashboard, Calendar, User, PlusCircle, Users, Settings } from "lucide-react";

interface TopbarProps {
  isStandalone?: boolean;
}

const menuItems = {
  CLIENT: [
    { label: "Dashboard", path: "/client/dashboard", icon: LayoutDashboard },
    { label: "Citas", path: "/client/appointments", icon: Calendar },
    { label: "Perfil", path: "/client/profile", icon: User },
    { label: "Reservar Cita", path: "/client/booking", icon: PlusCircle },
  ],
  PROFESSIONAL: [
    { label: "Dashboard", path: "/professional/dashboard", icon: LayoutDashboard },
    { label: "Pacientes", path: "/professional/patients", icon: Users },
    { label: "Perfil", path: "/professional/profile", icon: User },
  ],
  ADMIN: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Usuarios", path: "/admin/users", icon: Users },
    { label: "Configuración", path: "/admin/config", icon: Settings },
  ],
};

export const Topbar = ({ isStandalone = false }: TopbarProps) => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user || !user.profile || !user.role) return null;

  return (
    <header
      className={`topbar bg-white shadow p-4 flex flex-col md:flex-row justify-between items-center
        dark:bg-zinc-800/10 dark:text-white dark:shadow-zinc-7009 ${
          isStandalone ? "w-full" : ""
        }`}
    >
      {/* Logo y menú */}
      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="logo font-black text-xl tracking-tighter text-gray-900 dark:text-white">
            Consultorio<span className="text-indigo-500">App</span>
          </div>
        </div>

        {/* Menú horizontal con iconos */}
        {isStandalone && (
          <nav className="topbar-nav hidden md:flex ml-4">
            {menuItems[user.role].map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `topbar-navlink ${isActive ? "topbar-navlink-active" : ""}`
                }
              >
                <item.icon size={16} className="opacity-70" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      {/* User info */}
      <div className="user-info flex items-center gap-4 mt-4 md:mt-0">
        <div className="hidden md:block text-right">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-none">
            {user?.profile.name}
          </h2>
          {isStandalone && (
            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
              {user.role}
            </span>
          )}
        </div>

        <div className="h-8 w-[1px] bg-gray-200 dark:bg-white/10 hidden md:block mx-1" />

        <UserMenu />
      </div>
    </header>
  );
};
