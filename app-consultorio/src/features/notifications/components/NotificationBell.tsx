import { Fragment } from "react";
import { Bell, Check, BellOff, Circle } from "lucide-react";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { Menu, Transition } from "@headlessui/react";

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
    useNotifications();

  return (
    <Menu as="div" className="relative">
      {/* BOTÓN DE CAMPANA CON INDICADOR DINÁMICO */}
      <Menu.Button className="relative p-2 rounded-xl transition-all duration-300 hover:bg-slate-100 dark:hover:bg-white/5 group focus:outline-none">
        <Bell className="w-6 h-6 text-slate-600 dark:text-slate-300 group-hover:text-blue-500 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 text-[10px] font-black text-white items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-300"
        enterFrom="transform opacity-0 scale-95 -translate-y-2"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-200"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-4 w-80 sm:w-96 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2rem] border border-white/40 dark:border-white/10 overflow-hidden z-[100] focus:outline-none">
          {/* HEADER DEL MENÚ */}
          <div className="px-6 py-5 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center bg-white/20 dark:bg-white/5">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white tracking-tight">
                Notificaciones
              </h3>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">
                Centro de actividad
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="p-2 rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 group"
                title="Marcar todo como leído"
              >
                <Check size={16} strokeWidth={3} />
              </button>
            )}
          </div>

          {/* LISTADO DE NOTIFICACIONES */}
          <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:dark:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400/60 [&::-webkit-scrollbar-thumb]:dark:hover:bg-blue-500/40 [&::-webkit-scrollbar-thumb]:transition-colors">
            {isLoading ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Sincronizando...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl mb-4 text-slate-400">
                  <BellOff size={24} opacity={0.5} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 italic">
                  Todo en orden por aquí.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {notifications.map((n) => (
                  <Menu.Item key={n.id}>
                    {({ active }) => (
                      <div
                        className={`px-6 py-4 flex gap-4 cursor-pointer transition-all duration-300 ${
                          active ? "bg-blue-600/5 dark:bg-blue-600/10" : ""
                        } ${!n.isRead ? "relative" : "opacity-70 grayscale-[0.5]"}`}
                        onClick={() => !n.isRead && markAsRead(n.id)}
                      >
                        {/* PUNTO DE "NO LEÍDO" */}
                        {!n.isRead && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2">
                            <Circle
                              size={8}
                              className="fill-blue-600 text-blue-600 animate-pulse"
                            />
                          </div>
                        )}

                        <div className="flex-1 space-y-1">
                          <p
                            className={`text-sm tracking-tight ${!n.isRead ? "font-black text-slate-800 dark:text-white" : "font-medium text-slate-500"}`}
                          >
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-2 flex items-center gap-1">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            • {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER OPCIONAL */}
          <div className="p-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl text-center border-t border-slate-200/50 dark:border-white/5"></div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
