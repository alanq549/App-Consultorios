import { useAppSelector } from "../../../hooks/redux";
import { useState } from "react";
import "./ClientProfileCard.css";

import {
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

interface Props {
  onEditClick?: () => void;
}

const ClientProfileCard: React.FC<Props> = ({ onEditClick }) => {
  const user = useAppSelector((state) => state.auth.user);
  const [imageError, setImageError] = useState(false);

  if (!user) {
    return (
      <div className="profile-error" role="alert">
        No se encontró información del usuario.
      </div>
    );
  }

  const handleImageError = () => setImageError(true);

  return (
    <article className="profile-card-container">

      {/* 🔹 Header del perfil */}
      <header className="profile-card-header">

        <div className="profile-avatar-wrapper">
          {imageError ? (
            <div className="profile-avatar-fallback">
              {user.name.charAt(0)}
              {user.lastName.charAt(0)}
            </div>
          ) : (
            <img
              src={`${import.meta.env.VITE_STATIC_URL}${user.avatar}`}
              alt={`${user.name} ${user.lastName}`}
              onError={handleImageError}
              className="profile-avatar"
              loading="lazy"
            />
          )}

          {onEditClick && (
            <button
              onClick={onEditClick}
              className="profile-avatar-edit"
              aria-label="Editar perfil"
            >
              <FaEdit />
            </button>
          )}
        </div>

        <div className="profile-header-info">
          <h2 className="profile-name">
            {user.name} {user.lastName}
          </h2>

          {user.isVerified ? (
            <span className="verification-badge verified">
              <FaCheckCircle /> Verificado
            </span>
          ) : (
            <span className="verification-badge unverified">
              <FaTimesCircle /> No verificado
            </span>
          )}
        </div>
      </header>

      {/* 🔹 Datos de contacto */}
      <section className="profile-contact-section">
        <ul className="contact-details-list">
          <li className="detail-item">
            <FaEnvelope className="detail-icon" />
            <a href={`mailto:${user.email}`} className="detail-value">
              {user.email}
            </a>
          </li>

          <li className="detail-item">
            <FaPhone className="detail-icon" />
            {user.phone ? (
              <a href={`tel:${user.phone}`} className="detail-value">
                {user.phone}
              </a>
            ) : (
              <span className="detail-value muted">
                No especificado
              </span>
            )}
          </li>
        </ul>
      </section>

    </article>
  );
};

export default ClientProfileCard;
