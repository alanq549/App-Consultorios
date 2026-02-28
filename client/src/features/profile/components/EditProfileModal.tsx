import { Dialog } from "@headlessui/react";
import { useEditProfile } from "@/features/profile/hooks/useEditProfile";
import {
  FiX,
  FiPlus,
  FiTrash2,
  FiExternalLink,
  FiUpload,
} from "react-icons/fi";
import { useState } from "react";

const staticUrl = import.meta.env.VITE_STATIC_URL;

export default function EditProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    setName,
    name,
    setLastName,
    lastName,
    setPhone,
    avatarFile,
    setAvatarFile,
    phone,
    description,
    setDescription,
    socialLinks,
    setSocialLinks,
    newSocialKey,
    setNewSocialKey,
    newSocialUrl,
    setNewSocialUrl,
    handleAddSocial,
    handleRemoveSocial,
    certificates,
    handleRemoveCertificate,
    newFiles,
    handleNewFilesChange,
    handleSave,
    allowedSocials,
  } = useEditProfile(onClose);

const [avatarPreview, setAvatarPreview] = useState<string | null>(
  avatarFile ? URL.createObjectURL(avatarFile) : null
);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <Dialog.Panel className="w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-2xl shadow-xl overflow-hidden transition-all transform">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-zinc-100">
              Editar Perfil
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="p-6 space-y-6 max-h-[80vh] overflow-y-auto"
          >
            {/* User info */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Información personal
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={name}
                  required
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-200 text-sm"
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={lastName}
                  required
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-200 text-sm"
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={phone}
                  required
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-200 text-sm"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Avatar
                </label>
                <div className="flex items-center gap-4">
                  {avatarPreview && (
                    <img
                      src={avatarPreview}
                      alt="avatar"
                      className="w-16 h-16 rounded-full object-cover border border-gray-300 dark:border-zinc-600"
                      
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setAvatarFile(file);
                        setAvatarPreview(URL.createObjectURL(file)); // Actualiza preview
                      }
                      
                    }}
                    className="text-sm text-gray-600 dark:text-zinc-400"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2"
              >
                Descripción profesional
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-200 transition-colors"
                rows={5}
                placeholder="Describe tu experiencia, especialidades, enfoque profesional..."
              />
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Redes sociales
              </label>

              <div className="space-y-3">
                {Object.entries(socialLinks).map(([key, url]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 dark:text-zinc-300 w-20 truncate">
                        {key}:
                      </span>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) =>
                          setSocialLinks({
                            ...socialLinks,
                            [key]: e.target.value,
                          })
                        }
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-zinc-200"
                        placeholder={`https://${key.toLowerCase()}.com/tu-usuario`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSocial(key)}
                      className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <select
                  value={newSocialKey}
                  onChange={(e) =>
                    setNewSocialKey(e.target.value as typeof newSocialKey)
                  }
                  className="flex-shrink-0 w-32 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-200 text-sm"
                >
                  <option value="">Agregar...</option>
                  {allowedSocials
                    .filter((key) => !socialLinks[key])
                    .map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                </select>
                <input
                  type="url"
                  placeholder="URL del perfil"
                  value={newSocialUrl}
                  onChange={(e) => setNewSocialUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-200 text-sm"
                />
                <button
                  onClick={handleAddSocial}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  type="button"
                  disabled={!newSocialKey || !newSocialUrl}
                >
                  <FiPlus className="h-4 w-4" />
                  Agregar
                </button>
              </div>
            </div>

            {/* Certificates */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Certificados actuales
              </label>

              {certificates.length > 0 ? (
                <div className="border border-gray-200 dark:border-zinc-700 rounded-lg divide-y divide-gray-200 dark:divide-zinc-700">
                  {certificates.map((cert, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-zinc-700 rounded">
                          <span className="text-xs">PDF</span>
                        </div>
                        <a
                          href={`${staticUrl}${cert}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                        >
                          {cert.split("/").pop()}
                          <FiExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertificate(cert)}
                        className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        title="Eliminar certificado"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center bg-gray-50 dark:bg-zinc-700/30 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-zinc-400">
                    No hay certificados cargados
                  </p>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Certificados y documentos
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-lg hover:border-gray-400 dark:hover:border-zinc-500 transition-colors">
                    <FiUpload className="h-8 w-8 text-gray-400 dark:text-zinc-500 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-zinc-400">
                      Arrastra archivos o haz clic para seleccionar
                    </span>
                    <span className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                      PDF, JPG, PNG (máx. 10MB)
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleNewFilesChange}
                    className="hidden"
                  />
                </label>
              </div>

              {newFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {newFiles.map((file, idx) => {
                    const isImage = file.type.startsWith("image/");
                    const previewUrl = isImage
                      ? URL.createObjectURL(file)
                      : null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {isImage ? (
                            <img
                              src={previewUrl!}
                              alt={`preview-${file.name}`}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-zinc-600 rounded">
                              <span className="text-xs">PDF</span>
                            </div>
                          )}
                          <span className="text-sm text-gray-800 dark:text-zinc-200 truncate max-w-[180px]">
                            {file.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-gray-700 dark:text-zinc-300 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
