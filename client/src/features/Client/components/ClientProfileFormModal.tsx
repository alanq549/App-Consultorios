// 📄 ClientProfileFormModal.tsx (Modificado)

import React from "react";
import type { ClientProfile } from "../types";
import ClientProfileForm from "./ClientProfileForm";
import { FaTimes } from 'react-icons/fa'; // Importamos el icono X

interface Props {
  profile: ClientProfile;
  isOpen: boolean;
  onClose: () => void;
}

const ClientProfileFormModal: React.FC<Props> = ({ profile, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    // Fondo oscuro semi-transparente con blur (Glassmorphism para el fondo)
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm min-h-screen">
      
      {/* Contenedor del Modal: Panel de Control */}
      <div 
        className="
          p-8 rounded-xl shadow-2xl w-full max-w-lg relative 
          
          /* Glassmorphism en el modal */
          bg-white/50 dark:bg-neutral-900/80 
          backdrop-blur-md border border-gray-200/70 dark:border-teal-700/50 
          dark:shadow-teal-900/70
        "
      >
        <h2 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-gray-50 border-b border-teal-500/50 pb-2">
            Configuración de Identidad
        </h2>
        
        
        <ClientProfileForm profile={profile} onFinish={onClose} />

        
        
        {/* Botón de cierre: Geométrico y claro */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 p-2 rounded-full 
            text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400
            transition-colors
          "
          aria-label="Cerrar formulario"
        >
          <FaTimes className="text-xl" />
        </button>
      </div>
    </div>
  );
};

export default ClientProfileFormModal;