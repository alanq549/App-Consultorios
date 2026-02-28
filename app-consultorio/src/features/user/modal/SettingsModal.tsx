// src/components/settings/SettingsModal.tsx
import { useAppSelector } from "@/hooks/auth/useRedux";
import { useConfigActions } from "@/hooks/config/useConfigActions";

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const config = useAppSelector((s) => s.config.config);
  const { updateConfig } = useConfigActions();

  if (!config) return null;

  const handleLayoutChange = (layout: "SIDEBAR" | "TOPBAR") => {
    updateConfig({ layout });
  };

  const handleThemeChange = (theme: "LIGHT" | "DARK") => {
    updateConfig({ theme });
  };

  // Clase uniforme para botones
  const buttonClass = (active: boolean) =>
    `px-4 py-2 rounded-lg border transition backdrop-blur-md
    ${
      active
        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
        : "bg-white  dark:bg-neutral-800/40 border-neutral-300 dark:border-white/10 text-gray-800 dark:text-gray-100 hover:bg-neutral-200/20  dark:hover:bg-neutral-700/50"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900/70 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-white/20 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Configuración
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-8">

          {/* LAYOUT */}
          <section>
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Layout
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleLayoutChange("SIDEBAR")}
                className={buttonClass(config.layout === "SIDEBAR")}
              >
                Sidebar
              </button>
              <button
                onClick={() => handleLayoutChange("TOPBAR")}
                className={buttonClass(config.layout === "TOPBAR")}
              >
                Topbar
              </button>
            </div>
          </section>

          {/* THEME */}
          <section>
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Tema
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleThemeChange("LIGHT")}
                className={buttonClass(config.theme === "LIGHT")}
              >
                Claro
              </button>
              <button
                onClick={() => handleThemeChange("DARK")}
                className={buttonClass(config.theme === "DARK")}
              >
                Oscuro
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
