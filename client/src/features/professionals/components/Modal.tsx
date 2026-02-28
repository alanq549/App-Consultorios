import React, { type ReactNode, useEffect, useState } from "react";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
};

export default function Modal({ children, onClose }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Aparecer con animación
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Cerrar modal al presionar ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // espera a que termine la animación
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300  ${
        isVisible ? "opacity-100" : "opacity-0"
      } bg-black bg-opacity-50`}
      onClick={handleClose}
    >
      <div
        className={`dark:bg-zinc-950 transform transition-all duration-300  absolute${
          isVisible ? "scale-100" : "scale-95"
        }`}
      >
        <div
          className="bg-white dark:bg-teal-900/40  backdrop:blurrounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] p-6 border border-teal-400 overflow-auto backdrop-blur-sm"
          onClick={handleContentClick}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
