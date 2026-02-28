// layouts/components/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Calendar, User, 
  PlusCircle, Users, Settings 
} from "lucide-react";

interface SidebarProps {
  role: "CLIENT" | "PROFESSIONAL" | "ADMIN";
}

export const Sidebar = ({ role }: SidebarProps) => {
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

  return (
    <aside className="sidebar">
      <div className="mb-8 px-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/70">
          Sistema de Gestión
        </span>
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
          Portal {role}
        </h2>
      </div>

      <nav>
        <ul className="flex flex-col gap-2">
          {menuItems[role].map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `navlink ${isActive ? "navlink-active" : ""}`
                }
              >
                <item.icon size={18} className="mr-3 opacity-70" />
                <span className="text-sm tracking-wide">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};