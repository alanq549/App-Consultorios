import { useState } from "react";
import { useProfileData } from "@/hooks/useProfileData";
import CertificatesDisplay from "@/components/CertificatesDisplay";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaLink,
} from "react-icons/fa";
import { FiUser } from "react-icons/fi";
import EditProfileModal from "@/features/profile/components/EditProfileModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileDetails() {
  const { user, profile } = useProfileData();
  const staticUrl = import.meta.env.VITE_STATIC_URL;
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  if (!user || !profile) {
    return (
      <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-7 w-48 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Secciones Skeleton */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-6 space-y-4 bg-white dark:bg-zinc-800 rounded-2xl shadow"
          >
            <Skeleton className="h-6 w-1/3 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      {/* Header con botón - Adapta su layout según espacio  */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
        {/* Imagen + Info */}
        <div className="flex flex-col xs:flex-row items-center xs:items-start gap-6">
          <div className="relative">
            <img
              src={
                user.avatar
                  ? `${staticUrl}${user.avatar}`
                  : "/default-avatar.png"
              }
              alt="avatar"
              className="w-32 h-32 object-cover rounded-full border-4 border-teal-500/80 hover:border-teal-400 transition-all"
            />
            {profile.isVerified && (
              <div className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-700 p-1 rounded-full shadow">
                <FaCheckCircle className="text-green-500 text-xl" />
              </div>
            )}
          </div>

          <div className="flex flex-col text-center xs:text-left space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              {user.name} {user.lastName}
            </h2>
            {profile.specialty?.name && (
              <span className="inline-block px-3 py-1 bg-teal-100/50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 rounded-full text-sm font-medium">
                {profile.specialty.name}
              </span>
            )}
            <div className="flex items-center justify-center xs:justify-start gap-2 mt-1">
              {profile.isVerified ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <FaCheckCircle /> Verificado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <FaTimesCircle /> No verificado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botón edición */}
        <button
          onClick={() => setEditModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-400/70 hover:bg-teal-400  dark:bg-teal-800/40 dark:hover:bg-teal-700/60 dark:border dark:border-teal-400 text-white rounded-lg shadow-sm transition-all self-center sm:self-auto"
        >
          <FaEdit /> Editar Perfil
        </button>
      </div>

      {/* Datos de contacto - Mejor jerarquía visual */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 space-y-4 transition-all hover:shadow-xl">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-zinc-700">
          <FiUser className="text-teal-500" /> Información de contacto
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <FaEnvelope className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <a
              href={`mailto:${user.email}`}
              className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              {user.email}
            </a>
          </div>

          {user.phone && (
            <div className="flex items-center gap-3">
              <FaPhone className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <a
                href={`tel:${user.phone}`}
                className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                {user.phone}
              </a>
            </div>
          )}

          <div>
            <h4 className="font-medium mt-3 mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FaLink className="text-gray-500 dark:text-gray-400" /> Redes
              Sociales
            </h4>
            {Object.entries(profile.socialLinks || {}).length > 0 ? (
              <ul className="space-y-2 pl-7">
                {Object.entries(profile.socialLinks).map(([platform, url]) => (
                  <li
                    key={platform}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <span className="capitalize text-gray-500 dark:text-gray-400 w-20 text-right">
                      {platform}:
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 dark:text-teal-400 hover:underline truncate max-w-xs"
                    >
                      {url.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 text-sm pl-7">
                No hay redes sociales registradas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Descripción - Mejor legibilidad */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white pb-2 border-b border-gray-200 dark:border-zinc-700">
          Sobre mí
        </h3>
        <p className="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
          {profile.description || (
            <span className="text-gray-400 dark:text-gray-500 italic">
              Este usuario no ha agregado una descripción.
            </span>
          )}
        </p>
      </div>

      {/* Certificados - Sección más destacada */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white pb-2 border-b border-gray-200 dark:border-zinc-700">
          Certificados y credenciales
        </h3>
        <div className="mt-4">
          <CertificatesDisplay existingCertificates={profile.certificates} />
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
    </div>
  );
}
