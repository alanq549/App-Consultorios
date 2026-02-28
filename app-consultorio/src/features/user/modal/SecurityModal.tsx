import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

export const SecurityModal = ({ onClose }: { onClose: () => void }) => {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // lógica de seguridad
    onClose();
  };

  return (
    <Modal title="Seguridad" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="Ingrese contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Confirmar
          </button>
        </div>
      </form>
    </Modal>
  );
};
