import { useState } from "react";
import ProfessionalProfileModal from "./ProfessionalProfileModal";
import type {
  User,
  ProfessionalProfile,
  Review,
} from "@/features/Admin/admin.types";

export  type Professional = {
  id: number;
  specialtyId: number;
  user: Pick<User, "id" | "name" | "lastName" | "avatar">;
  description: string;
} & Partial<Omit<ProfessionalProfile, "id" | "specialtyId" | "description">> & {
    reviewsReceived?: Review[];
  };

type Props = {
  professional: Professional;
  onSelect?: (userId: number) => void;
  showSelectButton?: boolean;
};

function normalizeProfessional(
  prof: Professional
): ProfessionalProfile & { user: Pick<User, "name" | "lastName"> } {
  return {
    ...prof,
    certificates: prof.certificates || [],
    socialLinks: prof.socialLinks || {},
    description: prof.description || "",
    specialty: prof.specialty || { id: 0, name: "Sin especialidad" },
    isVerified: prof.isVerified ?? false,
  };
}

export default function ProfessionalCard({
  professional,
  onSelect,
  showSelectButton = false,
}: Props) {
  const [showProfile, setShowProfile] = useState(false);
  const staticUrl = import.meta.env.VITE_STATIC_URL;

  const handleSelect = () => {
    if (onSelect) onSelect(professional.user.id);
  };

  return (
    <>
<div className=" bg-white/70 dark:bg-neutral-800/30 backdrop-blur-sm border border-white/20 dark:hover:bg-teal-900/10 dark:hover:border-teal-400/20 rounded-2xl shadow-xl mt-5 p-6 flex flex-col items-center text-center transition-all hover:shadow-2xl">
        <img
          src={
            `${staticUrl}${professional.user.avatar}` || "/default-avatar.png"
          }
          alt={`${professional.user.name} ${professional.user.lastName}`}
className="w-24 h-24 rounded-full object-cover mb-4  border-2 border-gray-200/50 dark:border-teal-500/70 shadow-sm cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={() => setShowProfile(true)}
        />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {professional.user.name} {professional.user.lastName}
        </h3>
        <p className="text-sm text-teal-500  mt-1">
          {professional.specialty?.name ?? "Especialidad"}
        </p>

        {/* Rating y reseñas */}
        <div className="mt-3 flex items-center justify-center">
          <div className="flex items-center text-yellow-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="ml-1 text-gray-700 dark:text-gray-300 font-medium">
              {professional.reviewsReceived?.length ?? 0}
            </span>
          </div>
          <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {professional.reviewsReceived?.length ?? 0} reseñas
          </span>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
          {professional.description || "Sin descripción"}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setShowProfile(true)}
            className="px-4 py-1.5 border bg-teal-600/80 dark:bg-teal-800/20 dark:border-teal-400 hover:bg-teal-400/100 dark:hover:bg-neutral-800/20 text-white rounded-xl shadow-md backdrop-blur-sm  transition "
          >
            Ver Perfil
          </button>
          {showSelectButton && (
            <button
              onClick={handleSelect}
            className="px-4 py-1.5 border bg-teal-600/80 dark:bg-teal-800/20 dark:border-teal-400 hover:bg-teal-400/100 dark:hover:bg-neutral-800/20 text-white rounded-xl shadow-md backdrop-blur-sm  transition "
            >
              Seleccionar
            </button>
          )}
        </div>
      </div>

      {showProfile && (
        <ProfessionalProfileModal
          professional={normalizeProfessional(professional)}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
}
