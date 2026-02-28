import { useAppSelector } from "../../../hooks/redux";
import ClientProfileCard from "../components/ClientProfileCard";
import ClientProfileFormModal from "../components/ClientProfileFormModal";
import { useState } from "react";
import "@/styles/features/client/MyProfile.css";

const MyProfile = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [showForm, setShowForm] = useState(false);

  if (!user) {
    return (
      <div className="profile-loading-error">
        Error al cargar el perfil
      </div>
    );
  }

  return (
    <div className="c_profile-container">

      {/* 🔹 Header tipo red social */}
      <header className="c_profile-header">
        <h1 className="c_profile-title">Mi perfil</h1>
        <p className="c_profile-subtitle">
          Administra tu información y actividad
        </p>
      </header>

      {/* 🔹 Layout principal (3 columnas) */}
      <section className="c_profile-layout">

        {/* Columna izquierda — Identidad */}
        <aside className="c_profile-left">
          <ClientProfileCard onEditClick={() => setShowForm(true)} />
        </aside>

        {/* Columna central — Feed / Actividad */}
        <main className="c_profile-center">
          <div className="c_profile-feed-card">
            <h2 className="c_profile-section-title">Actividad</h2>

            <div className="c_profile-empty-feed">
              <p>Aún no hay actividad</p>
              <span>
                Cuando interactúes con la plataforma, aparecerá aquí.
              </span>
            </div>
          </div>
        </main>

        {/* Columna derecha — Acciones rápidas */}
        <aside className="c_profile-right">
          <div className="c_profile-actions-card">
            <h2 className="c_profile-section-title">Acciones</h2>

            <button
              onClick={() => setShowForm(true)}
              className="c_profile-action-btn primary"
            >
              Editar perfil
            </button>

            <button className="c_profile-action-btn">
              Privacidad
            </button>

            <button className="c_profile-action-btn">
              Configuración
            </button>
          </div>
        </aside>

      </section>

      {/* 🔹 Modal */}
      <ClientProfileFormModal
        profile={user}
        isOpen={showForm}
        onClose={() => setShowForm(false)}
      />
    </div>
  );
};

export default MyProfile;
