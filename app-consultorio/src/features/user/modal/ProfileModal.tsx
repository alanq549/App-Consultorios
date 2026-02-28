import type { UserProfileUI } from "@/types/ui.types";
import { useState } from "react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfileUI;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Perfil</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <p className="mt-1 text-gray-900">{user?.fullName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-gray-900">{user?.email}</p>
          </div>

          {user?.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <p className="mt-1 text-gray-900">{user.phone}</p>
            </div>
          )}

          {user?.role && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rol
              </label>
              <p className="mt-1 text-gray-900">{user.role}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Editar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
