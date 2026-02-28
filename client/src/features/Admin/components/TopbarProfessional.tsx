import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "@/components/UserMenu";
import ConfigModal from "@/components/ConfigModal";
import "@/styles/features/professional/components/topbarProfessional.css";
import NotificationsDropdown from "@/features/notifications/components/NotificationsDropdown";

export default function TopbarAdmin() {
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="topbar-header">
        {/* Izquierda: título fijo */}
        <h1 className="topbar-title">Consultorio</h1>

        {/* Centro: nav links */}
        <nav className="topbar-nav">
          <Link
            to="/admin/dashboard"
            className={`topbar-link ${
              location.pathname === "/professional/dashboard" ? "active" : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/admin/users"
            className={`topbar-link ${
              location.pathname === "/admin/users" ? "active" : ""
            }`}
          >
            Usuarios
          </Link>
          <Link
            to="/admin/specialties"
            className={`topbar-link ${
              location.pathname === "/admin/specialties"
                ? "active"
                : ""
            }`}
          >
            Especialidades
          </Link>
          <Link
            to="/admin/profile"
            className={`topbar-link ${
              location.pathname === "/admin/profile" ? "active" : ""
            }`}
          >
            Perfil
          </Link>
        </nav>

        {/* Derecha: campana + menú usuario */}
        <div className="topbar-right">
          <button
            aria-label="Notificaciones"
            className="notification-button"
            onClick={() => alert("Aquí irían tus notificaciones")} // Puedes cambiar la acción aquí
          >            
          </button>
                      <NotificationsDropdown />
          
          <UserMenu onOpenConfig={() => setOpenConfigModal(true)} />
        </div>
      </header>

      <ConfigModal
        isOpen={openConfigModal}
        onClose={() => setOpenConfigModal(false)}
      />
    </>
  );
}
