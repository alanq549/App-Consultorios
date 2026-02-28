import { useState, useEffect } from "react";
import { useCustomConfig } from "@/features/customConfig/customConfigHooks";
import "@/styles/components/configModal.css";

export default function ConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { config, updateConfig } = useCustomConfig();

  const [layout, setLayout] = useState<string>(config?.layout || "SIDEBAR");
  const [theme, setTheme] = useState<string>(config?.theme || "light");

  useEffect(() => {
    if (config) {
      setLayout(config.layout);
      setTheme(config.theme);
    }
  }, [config]);

  const handleSave = () => {
    updateConfig({ layout, theme });
    onClose();
  };

  if (!isOpen) return null;

  return (
<div className="modal-overlay" data-state="open" onClick={onClose}>
  <div
    className="modal-container"
    data-state="open"
    onClick={(e) => e.stopPropagation()}
  >
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="modal-icon">⚙️</span>
            Configuración
          </h2>
          <button onClick={onClose} className="modal-close-button">
            &times;
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-field-group">
            <label className="modal-label">
              <span className="modal-label-icon">📐</span>
              Diseño del Layout
            </label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="modal-select"
            >
              <option value="SIDEBAR">Sidebar (Navegación lateral)</option>
              <option value="TOPBAR">Topbar (Navegación superior)</option>
            </select>
            <p className="modal-hint">Cambia la posición del menú principal</p>
          </div>

          <div className="modal-field-group">
            <label className="modal-label">
              <span className="modal-label-icon">🎨</span>
              Tema de la aplicación
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="modal-select"
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
            <p className="modal-hint">Selecciona tu preferencia de color</p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="modal-button modal-button-cancel">
            Cancelar
          </button>
          <button onClick={handleSave} className="modal-button modal-button-save">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}