// 📄 TopbarClient.jsx (Modificado)
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "@/components/UserMenu";
import ConfigModal from "@/components/ConfigModal";
import "@/styles/features/client/components/topbarClient.css";
import NotificationsDropdown from "@/features/notifications/components/NotificationsDropdown";

// Importar iconos para mejorar la UX (Asumiendo React Icons)
import { FaHome, FaCalendarAlt, FaUserMd, FaUser } from "react-icons/fa";

// Definición de enlaces con iconos
const links = [
    { to: "/client/dashboard", label: "Dashboard", icon: <FaHome /> },
    { to: "/client/schedule", label: "Citas", icon: <FaCalendarAlt /> },
    { to: "/client/appointments", label: "Mis Citas", icon: <FaUserMd /> },
    { to: "/client/Myperfil", label: "Perfil", icon: <FaUser /> },
];

export default function TopbarClient() {
    const [openConfigModal, setOpenConfigModal] = useState(false);
    const location = useLocation();

    return (
        <>
            <header className="client_topbar-header">
                {/* Izquierda: título fijo */}
                <h1 className="client_topbar-title">Consultorio</h1>

                {/* Centro: nav links */}
                <nav className="client_topbar-nav">
                    {links.map(({ to, label, icon }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`client_topbar-link ${
                                location.pathname === to ? "active" : ""
                            }`}
                            title={label}
                        >
                            <span className="link-icon">{icon}</span> {/* <-- Añadir ícono */}
                            <span className="link-label">{label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Derecha: campana + menú usuario */}
                <div className="client_topbar-right relative" >
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