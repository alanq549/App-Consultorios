import { useState, useRef, useEffect } from "react";
import { useAppSelector } from "@/hooks/auth/useRedux";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { staticbackend } from "@/config/variables";
import { SettingsModal } from "@/features/user/modal/SettingsModal";
import { Link } from "react-router-dom";
import { SecurityModal } from "@/features/user/modal/SecurityModal";
import { LogOut, Settings, User, ChevronDown } from "lucide-react";

type Role = "CLIENT" | "PROFESSIONAL" | "ADMIN";

const roleConfig: Record<Role, { basePath: string }> = {
  CLIENT: { basePath: "/client" },
  PROFESSIONAL: { basePath: "/professional" },
  ADMIN: { basePath: "/admin" },
};

export const UserMenu = () => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openModal, setOpenModal] = useState<"profile" | "settings" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector((s) => s.auth.user);
  const { logoutUser } = useAuthActions();

  // Cierra el menú al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user || !user.profile) return null;

  const normalizedRole = (user.role || "").toUpperCase() as Role;
  const basePath = roleConfig[normalizedRole]?.basePath ?? "/client";
  const avatarUrl = user.profile.avatar
    ? `${staticbackend}${user.profile.avatar}`
    : "/avatar-placeholder.png";

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* TRIGGER */}
        <button
          onClick={() => setOpenMenu((o) => !o)}
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl transition-all duration-300 hover:bg-white/30 dark:hover:bg-white/5 group"
        >
          <img
            src={avatarUrl}
            alt={`Avatar de ${user.profile.name}`}
            className="w-8 h-8 rounded-xl object-cover border border-white/30 dark:border-white/10 shadow-sm group-hover:scale-105 transition-transform duration-300"
          />
          <span className="hidden sm:block text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight max-w-[100px] truncate">
            {user.profile.name.split(" ")[0]}
          </span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform duration-300 ${openMenu ? "rotate-180" : ""}`}
          />
        </button>

        {/* DROPDOWN */}
        {openMenu && (
          <div className="absolute right-0 mt-3 w-64 rounded-[1.5rem] z-50 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* HEADER */}
            <div className="px-5 py-4 bg-white/20 dark:bg-white/5 border-b border-white/20 dark:border-white/5 flex items-center gap-3">
              <img
                src={avatarUrl}
                alt=""
                className="w-10 h-10 rounded-xl object-cover border border-white/30 dark:border-white/10 shadow-sm"
              />
              <div className="min-w-0">
                <p className="font-black text-slate-800 dark:text-white tracking-tight truncate">
                  {user.profile.name}
                </p>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] truncate">
                  {normalizedRole === "PROFESSIONAL" ? "Profesional" : normalizedRole === "ADMIN" ? "Administrador" : "Cliente"}
                </p>
              </div>
            </div>

            {/* ITEMS */}
            <ul className="p-2 space-y-0.5">
              <li>
                <Link
                  to={`${basePath}/profile`}
                  onClick={() => setOpenMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="p-1.5 bg-slate-100 dark:bg-white/5 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                    <User size={14} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                  </div>
                  Perfil
                </Link>
              </li>

              <li>
                <button
                  onClick={() => { setOpenModal("settings"); setOpenMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="p-1.5 bg-slate-100 dark:bg-white/5 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                    <Settings size={14} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                  </div>
                  Configuración
                </button>
              </li>

              {/* DIVISOR */}
              <li className="my-1 border-t border-slate-100 dark:border-white/5" />

              <li>
                <button
                  onClick={logoutUser}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all duration-200 group"
                >
                  <div className="p-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg">
                    <LogOut size={14} className="text-red-400" />
                  </div>
                  Cerrar sesión
                </button>
              </li>
            </ul>

            {/* FOOTER */}
            <div className="px-5 py-3 bg-white/10 dark:bg-white/5 border-t border-white/20 dark:border-white/5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {openModal === "settings" && <SettingsModal onClose={() => setOpenModal(null)} />}
      {openModal === "profile" && <SecurityModal onClose={() => setOpenModal(null)} />}
    </>
  );
};