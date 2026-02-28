import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "@/components/UserMenu";
import ConfigModal from "@/components/ConfigModal";

import {
  FaTachometerAlt,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

import "@/styles/features/professional/components/SidebarProfessional.css";
import { FaUserDoctor } from "react-icons/fa6";
import NotificationsDropdown from "@/features/notifications/components/NotificationsDropdown";

const links = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: <FaTachometerAlt />,
  },
  { to: "/admin/users", label: "Usuarios", icon: <FaCalendarAlt /> },
  {
    to: "/admin/specialties",
    label: "Especialidades",
    icon: <FaClock />,
  },
  { to: "/admin/profile", label: "Perfil", icon: <FaUserDoctor /> },
];

export default function SidebarAdmin() {
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Para marcar el link activo
  const location = useLocation();

  return (
    <>
      <aside
        className={`sidebar-professional ${
          collapsed ? "collapsed" : "expanded"
        }`}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        <nav>
          {links.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`sidebar-link ${
                location.pathname === to ? "active" : ""
              }`}
              title={collapsed ? label : ""}
            >
              <span className="icon">{icon}</span>
              {!collapsed && <span className="label">{label}</span>}
            </Link>
          ))}
        </nav>

        {/* esta parte en especifico... */}
        <div className="sidebar-footer">
          
          <UserMenu
            onOpenConfig={() => setOpenConfigModal(true)}
            collapsed={collapsed}
          />
          {!collapsed && (
                       <NotificationsDropdown />

          )}
        </div>
      </aside>

      <ConfigModal
        isOpen={openConfigModal}
        onClose={() => setOpenConfigModal(false)}
      />
    </>
  );
}
