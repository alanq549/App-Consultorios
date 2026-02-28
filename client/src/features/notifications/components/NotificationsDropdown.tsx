// src/features/notifications/components/NotificationsDropdown.tsx
import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../notificationsHooks";
import { useAppSelector } from "@/hooks/redux";
import OverlayPortal from "@/components/portals/OverlayPortal";

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const { notifications, isLoading, markAsRead } = useNotifications();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const layout = useAppSelector(
    (state) => state.auth.user?.config?.layout || "SIDEBAR"
  );

  // 🔹 Cerrar al hacer click afuera (botón + dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      {/* 🔔 BOTÓN (se queda en el layout) */}
      <button
        ref={buttonRef}
        aria-label="Notificaciones"
        className="client_notification-button relative"
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="client_bell-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          width={24}
          height={24}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 📦 DROPDOWN (PORTAL + FIXED) */}
      {open && (
        <OverlayPortal>
          <div
            ref={dropdownRef}
            className={
              layout === "SIDEBAR"
                ? "fixed left-16 bottom-16 w-80 max-h-96 overflow-auto backdrop-blur-md bg-white dark:bg-neutral-800/30  border-2 dark:border-white/10 rounded-xl shadow-lg z-[9999]"
                : "fixed right-4 top-16 w-80 max-h-96 overflow-auto backdrop-blur-md bg-white dark:bg-neutral-800/30 backdrop:blur-md border-2 dark:border-white/20 rounded-xl shadow-lg z-[9999]"
            }
          >
            <h3 className="p-2 border-b font-semibold dark:text-teal-300">Notificaciones</h3>

            {isLoading && (
              <p className="p-2 text-center">Cargando...</p>
            )}

            {!isLoading && notifications.length === 0 && (
              <p className="p-2 text-center text-gray-500">
                No tienes notificaciones.
              </p>
            )}

            <ul>
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  className={`p-2 cursor-pointer border-b-2  dark:border-white/10 hover:bg-teal-50 dark:hover:bg-neutral-700/60 ${
                    notif.isRead
                      ? "text-gray-600 dark:text-gray-50"
                      : "font-bold bg-gray-50 dark:bg-transparent dark:text-zinc-100"
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                  }}
                >
                  <p>{notif.title}</p>
                  <p className="text-sm text-gray-700 dark:text-zinc-200">
                    {notif.message}
                  </p>
                  <small className="text-xs text-gray-500 dark:text-zinc-300">
                    {new Date(notif.createdAt).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
