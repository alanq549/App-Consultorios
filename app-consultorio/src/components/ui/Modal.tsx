// src/components/ui/Modal.tsx
import {type ReactNode, useEffect, useState } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ title, onClose, children }: ModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animación de fade + scale
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // esperar animación antes de cerrar
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`
          w-full max-w-lg rounded-2xl
          bg-white dark:bg-neutral-900/70
          backdrop-blur-xl
          border border-white/30 dark:border-white/10
          shadow-2xl overflow-hidden
          transform transition-all duration-200
          ${isVisible ? "scale-100" : "scale-95"}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/20 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-gray-800 dark:text-gray-200">{children}</div>
      </div>
    </div>
  );
};
