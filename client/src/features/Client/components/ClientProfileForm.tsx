import React, { useState } from "react";
import { useUpdateClientProfile } from "../clientHooks";
import type { ClientProfile } from "../types";
import "./ClientProfileForm.css";

interface Props {
  profile: ClientProfile;
  onFinish?: () => void;
}

const ClientProfileForm: React.FC<Props> = ({ profile, onFinish }) => {
  const [form, setForm] = useState({
    name: profile.name || "",
    lastName: profile.lastName || "",
    phone: profile.phone || "",
  });
  const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined);

  const { mutate, isPending } = useUpdateClientProfile();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const onlyNums = value.replace(/\D/g, ""); // Eliminar todo lo que no sea número
      setForm({ ...form, [name]: onlyNums });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(
      { ...form, avatarFile },
      {
        onSuccess: () => {
          onFinish?.(); // cerrar modal
        },
      }
    );
  };

return (
  // Eliminamos el fondo/sombra del formulario, ya que el modal padre lo maneja
  <form onSubmit={handleSubmit} className="client-form-container">

    {/* Previsualización de Avatar */}
    {avatarFile && (
      <img
        src={URL.createObjectURL(avatarFile)}
        alt="Preview"
        className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-2 border-teal-400 shadow-md"
      />
    )}

    {/* Input de Avatar */}
    <div className="mb-4">
      <label htmlFor="avatar" className="block text-sm font-medium mb-1 dark:text-gray-300">
        [DATAPOINT] Avatar (Registro Biom.)
      </label>
      <input
        id="avatar"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="client-form-file"
      />
    </div>

    {/* Campos de Texto */}
    <div className="mb-4">
      <label htmlFor="name" className="block text-sm font-medium mb-1 dark:text-gray-300">
        [DATAPOINT] Nombre Legal
      </label>
      <input
        id="name"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Ingrese su nombre..."
        className="client-form-input"
      />
    </div>
    
    {/* ... (lastName y phone se mantienen similares) ... */}

    <div className="mb-4">
      <label htmlFor="lastName" className="block text-sm font-medium mb-1 dark:text-gray-300">
        [DATAPOINT] Apellido
      </label>
      <input
        id="lastName"
        name="lastName"
        value={form.lastName}
        onChange={handleChange}
        placeholder="Ingrese su apellido..."
        className="client-form-input"
      />
    </div>

    <div className="mb-4">
      <label htmlFor="phone" className="block text-sm font-medium mb-1 dark:text-gray-300">
        [DATAPOINT] Teléfono de Contacto
      </label>
      <input
        id="phone"
        name="phone"
        value={form.phone}
        onChange={handleChange}
        placeholder="555-123-4567"
        className="client-form-input font-mono" // Usamos font-mono para números
      />
    </div>

    {/* Botón de Envío: Alto Contraste y Neon */}
    <button
      type="submit"
      disabled={isPending}
      className="client-form-button" // La clase se define en CSS
    >
      {isPending ? "PROCESANDO DATOS..." : "CONFIRMAR REGISTRO"}
    </button>
  </form>
);
};

export default ClientProfileForm;