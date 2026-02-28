import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "@/components/UserMenu";
import ConfigModal from "@/components/ConfigModal";

import { FaTachometerAlt, FaCalendarAlt } from "react-icons/fa";

import "@/styles/features/client/components/SidebarClient.css";
import { FaUserDoctor } from "react-icons/fa6";
import NotificationsDropdown from "@/features/notifications/components/NotificationsDropdown";

const links = [
  {
    to: "/client/dashboard",
    label: "Dashboard",
    icon: <FaTachometerAlt />,
  },
  { to: "/client/schedule", label: "Cita", icon: <FaUserDoctor /> },
  { to: "/client/appointments", label: "Mi Citas", icon: <FaCalendarAlt /> },
  { to: "/client/Myperfil", label: "Mi perfil", icon: <FaUserDoctor /> },
];

export default function SidebarClient() {
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const location = useLocation();

  return (
    <>
      <aside
        className={`client_sidebar-professional ${
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
              className={`client_sidebar-link ${
                location.pathname === to ? "active" : ""
              }`}
              title={collapsed ? label : ""}
            >
              <span className="icon">{icon}</span>
              {!collapsed && <span className="label">{label}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer"> {/* al abrir el usermenu se rompe el overflow-y que esta en las paginas automaticas */} 
          <UserMenu
            onOpenConfig={() => setOpenConfigModal(true)}
            collapsed={collapsed}
          />
          {!collapsed && <NotificationsDropdown />}
        </div>
      </aside>

      <ConfigModal
        isOpen={openConfigModal}
        onClose={() => setOpenConfigModal(false)}
      />
    </>
  );
}
