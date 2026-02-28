import { useState } from "react";
import { useAppSelector } from "@/hooks/auth/useRedux";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { staticbackend } from "@/config/variables";
import { SettingsModal } from "@/features/user/modal/SettingsModal";
import { Link } from "react-router-dom";
import { SecurityModal } from "@/features/user/modal/SecurityModal";

type Role = "CLIENT" | "PROFESSIONAL" | "ADMIN";

const roleConfig: Record<Role, { basePath: string }> = {
  CLIENT: { basePath: "/client" },
  PROFESSIONAL: { basePath: "/professional" },
  ADMIN: { basePath: "/admin" },
};

export const UserMenu = () => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openModal, setOpenModal] = useState<"profile" | "settings" | null>(
    null,
  );

  const user = useAppSelector((s) => s.auth.user);
  const { logoutUser } = useAuthActions();

  if (!user || !user.profile) return null;

  // 🔥 Normalización segura
  const normalizedRole = (user.role || "").toUpperCase() as Role;

  const basePath =
    roleConfig[normalizedRole]?.basePath ?? "/client";

  const avatarUrl = user.profile.avatar
    ? `${staticbackend}${user.profile.avatar}`
    : "/avatar-placeholder.png";

  const handleLogout = () => {
    logoutUser();
  };

  return (
    <>
      <div className="relative">
        <img
          src={avatarUrl}
          alt={`Avatar de ${user.profile.name}`}
          onClick={() => setOpenMenu((o) => !o)}
          className="
            w-9 h-9
            rounded-full
            object-cover
            cursor-pointer
            border border-white/30 dark:border-white/10
            shadow-sm
            hover:scale-105
            transition
          "
        />

        {openMenu && (
          <div
            className="
              absolute right-0 mt-3 w-56
              rounded-xl
              z-50
              bg-white/70 dark:bg-neutral-900/70
              backdrop-blur-xl
              border border-white/30 dark:border-white/10
              shadow-2xl
              overflow-hidden
            "
          >
            <div className="p-4 border-b border-white/20 dark:border-white/10">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {user.profile.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>

            <ul className="py-1 text-sm">
              <li>
                <Link
                  to={`${basePath}/profile`}
                  onClick={() => setOpenMenu(false)}
                  className="
                    block px-4 py-2
                    text-gray-800 dark:text-gray-200
                    hover:bg-white/40 dark:hover:bg-white/10
                    transition
                  "
                >
                  Perfil
                </Link>
              </li>

              <li>
                <button
                  onClick={() => {
                    setOpenModal("settings");
                    setOpenMenu(false);
                  }}
                  className="
                    w-full text-left px-4 py-2
                    text-gray-800 dark:text-gray-200
                    hover:bg-white/40 dark:hover:bg-white/10
                    transition
                  "
                >
                  Configuración
                </button>
              </li>

              <li>
                <button
                  onClick={() => {
                    setOpenModal("profile");
                    setOpenMenu(false);
                  }}
                  className="
                    w-full text-left px-4 py-2
                    text-gray-800 dark:text-gray-200
                    hover:bg-white/40 dark:hover:bg-white/10
                    transition
                  "
                >
                  Seguridad
                </button>
              </li>

              <li>
                <button
                  onClick={handleLogout}
                  className="
                    w-full text-left px-4 py-2
                    text-red-500
                    hover:bg-red-500/10
                    transition
                  "
                >
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {openModal === "settings" && (
        <SettingsModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === "profile" && (
        <SecurityModal onClose={() => setOpenModal(null)} />
      )}
    </>
  );
};