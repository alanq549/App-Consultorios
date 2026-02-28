// src/components/UserMenu.tsx
import { Menu, Portal } from "@headlessui/react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { logout } from "@/features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import "@/styles/components/userMenu.css";
import { resetCustomConfig } from "@/features/customConfig/customConfigSlice";

export default function UserMenu({
  onOpenConfig,
  collapsed,
}: {
  onOpenConfig: () => void;
  collapsed?: boolean;
}) {
  const { user } = useAppSelector((state) => state.auth);
  const layout =
    useAppSelector((state) => state.auth.user?.config?.layout) || "SIDEBAR";

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const staticUrl = import.meta.env.VITE_STATIC_URL;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetCustomConfig());
    navigate("/login");
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="user-menu-button">
        <img
          src={
            user?.avatar
              ? `${staticUrl}${user.avatar}`
              : "/default-avatar.png"
          }
          alt="avatar"
          className="user-avatar"
        />
        {!collapsed && <span className="user-name">{user?.name}</span>}
      </Menu.Button>

      {/* 🔥 PORTAL CORRECTO */}
      <Portal>
        <Menu.Items
          className={
            layout === "SIDEBAR"
              ? "user-menu-items-sidebar"
              : "user-menu-items-topbar"
          }
        >
          <div className="p-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onOpenConfig}
                  className={`user-menu-item ${
                    active ? "user-menu-item-active" : ""
                  }`}
                >
                  ⚙ Configuración
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => alert("Función reportar problema")}
                  className={`user-menu-item ${
                    active ? "user-menu-item-active" : ""
                  }`}
                >
                  Reportar un problema
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={`user-menu-item ${
                    active ? "user-menu-item-active" : ""
                  }`}
                >
                  Cerrar sesión
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Portal>
    </Menu>
  );
}
