// src/components/settings/SettingsModal.tsx
import { useAppSelector } from "@/hooks/auth/useRedux";
import { useConfigActions } from "@/hooks/config/useConfigActions";
import { X, Settings, LayoutDashboard, Sun, Moon, PanelLeft, PanelTop } from "lucide-react";

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const config = useAppSelector((s) => s.config.config);
  const { updateConfig } = useConfigActions();

  if (!config) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] border border-white/40 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">

        {/* HEADER */}
        <div className="p-8 border-b border-white/20 dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-neutral-800/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white">
              <Settings size={20} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                Configuración
              </h2>
              <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">
                Preferencias del sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-8">

          {/* LAYOUT */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <LayoutDashboard size={12} className="text-slate-400" />
              <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-[0.15em]">
                Disposición
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["SIDEBAR", "TOPBAR"] as const).map((layout) => {
                const active = config.layout === layout;
                const Icon = layout === "SIDEBAR" ? PanelLeft : PanelTop;
                return (
                  <button
                    key={layout}
                    onClick={() => updateConfig({ layout })}
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300 ${
                      active
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                        : "bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-500/30 backdrop-blur-md"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {layout === "SIDEBAR" ? "Sidebar" : "Topbar"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* DIVISOR */}
          <div className="border-t border-slate-100 dark:border-white/5" />

          {/* THEME */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <Sun size={12} className="text-slate-400" />
              <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-[0.15em]">
                Tema visual
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["LIGHT", "DARK"] as const).map((theme) => {
                const active = config.theme === theme;
                const Icon = theme === "LIGHT" ? Sun : Moon;
                return (
                  <button
                    key={theme}
                    onClick={() => updateConfig({ theme })}
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300 ${
                      active
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                        : "bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-500/30 backdrop-blur-md"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {theme === "LIGHT" ? "Claro" : "Oscuro"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-4 bg-white/20 dark:bg-white/5 border-t border-white/20 dark:border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/5 transition-all"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};