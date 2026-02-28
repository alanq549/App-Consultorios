import { useRegister } from "../authHooks";
import Input from "../components/form/Input";
import TextArea from "../components/form/TextArea";
import Checkbox from "../components/form/Checkbox";
import { useSpecialties } from "@/features/specialties/specialtiesHooks";
import { useState } from "react";
import { Upload, UserPlus } from "lucide-react"; // Nuevos iconos útiles

interface LoginProps {
  toggleFlip: () => void;
}

export default function Register({ toggleFlip }: LoginProps) {
  const {
    form,
    setForm,
    profile,
    handleChangeProfile,
    handleRegister,
    loading,
    error,
  } = useRegister();

  const { data: specialties, isLoading: isLoadingSpecialties } =
    useSpecialties();
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  return (
    // CAMBIO CLAVE: Glassmorphism y ajuste de tamaño para profesionales
    <form
  onSubmit={handleRegister}
  className={`bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8 space-y-8 w-full 
    /* El ancho es controlado por AuthPage, solo necesitamos w-full */
    transition-all duration-500 ease-in-out`}
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold text-white">
          <UserPlus className="inline-block mr-2 text-teal-400" size={28}/> Crea tu cuenta
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {form.isProfessional
            ? "Completa tu perfil profesional para ser verificado"
            : "Únete como paciente y gestiona tu salud"}
        </p>
      </div>
      
      <div
        className={`w-full gap-8 ${
          form.isProfessional ? "flex flex-col md:flex-row" : "flex flex-col"
        }`}
      >
        {/* Columna izquierda: Información Personal */}
        <div
          className={`flex flex-col gap-6 ${
            form.isProfessional ? "flex-1" : "w-full"
          }`}
        >
          {/* Avatar Upload */}
          <div className="flex flex-col items-center mb-4">
            <label className="relative cursor-pointer bg-teal-600 text-white rounded-full p-4 hover:bg-teal-500 transition-colors shadow-lg shadow-teal-500/20">
              <Upload size={20} className="inline-block mr-2" />
              Subir Avatar
              <input
                type="file"
                className="hidden"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setForm({ ...form, avatar: file });
                    setAvatarMessage(`✅ ${file.name} cargado`);
                  }
                }}
              />
            </label>
            {avatarMessage && (
              <span className="mt-2 inline-block text-sm text-teal-400 font-medium text-center max-w-[200px] truncate">
                {avatarMessage}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tu nombre"
            />
            <Input
              label="Apellido"
              value={form.lastName ?? ""}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Tu apellido"
            />
          </div>

          <Input
            label="Correo electrónico"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ejemplo@email.com"
          />

          <Input
            label="Contraseña"
            type="password"
            value={form.password ?? ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
          <Input
            label="Teléfono"
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1234567890"
          />

          <Checkbox
            label="Soy Profesional (Deseo ofrecer mis servicios)"
            checked={form.isProfessional ?? ""}
            onChange={(checked) =>
              setForm({ ...form, isProfessional: checked })
            }
          />
        </div>

        {/* Columna derecha solo si es profesional (Glass interior) */}
        {form.isProfessional && (
          <div 
            key="professional-block"
            // Glass interior para resaltar la sección
            className="flex-[1.5] p-6 pt-4 rounded-xl border border-teal-500/30 bg-white/5 transition-all duration-300 ease-in-out w-full space-y-4"
          >
            <h3 className="text-xl font-bold text-teal-400 mb-4">Información Profesional</h3>
            
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Especialidad
            </label>
            {isLoadingSpecialties ? (
              <p className="text-gray-500 text-sm">
                Cargando especialidades...
              </p>
            ) : (
              // Estilo mejorado para el select
              <select
                value={profile.specialtyId ?? ""}
                onChange={(e) =>
                  handleChangeProfile("specialtyId", Number(e.target.value))
                }
                className="block w-full rounded-md border-gray-700 bg-slate-800 text-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2"
              >
                <option value="">Selecciona una especialidad</option>
                {specialties?.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>
            )}

            <TextArea
              label="Descripción profesional"
              value={profile.description ?? ""}
              onChange={(e) =>
                handleChangeProfile("description", e.target.value)
              }
              placeholder="Describe tus habilidades, experiencia y enfoque profesional..."
              rows={4}
            />

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Certificado (PDF o imagen)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-teal-500/50 border-dashed rounded-md bg-white/5">
                <div className="space-y-1 text-center">
                  <label
                    htmlFor="certificates"
                    className="relative cursor-pointer rounded-md font-medium text-teal-400 hover:text-teal-300 focus-within:outline-none transition-colors"
                  >
                    <Upload size={20} className="inline-block mr-1" />
                    <span>Sube archivo(s)</span>
                    <input
                      id="certificates"
                      name="certificates"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleChangeProfile("certificates", files);

                        // ✅ Marca visual cuando se suben archivos
                        if (files.length > 0) {
                          setUploadMessage(`Se subieron ${files.length} archivo(s) ✅`);
                        } else {
                          setUploadMessage(null);
                        }
                      }}
                    />
                  </label>
                  <p className="text-xs text-gray-500">
                    PDF, JPG, PNG hasta 10MB
                  </p>
                </div>
              </div>

              {/* Aviso de subida */}
              {uploadMessage && (
                <p className="mt-2 text-sm text-teal-400 font-medium">
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        {/* Botón principal con color Teal */}
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-slate-900 bg-teal-500 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200 shadow-md hover:shadow-lg shadow-teal-500/30"
        >
          {loading ? "Procesando..." : "Registrarse"}
        </button>

        {/* Manejo de errores */}
        {error && (
          <div className="mt-4 bg-red-900/50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={toggleFlip}
            className="font-medium text-teal-400 hover:text-teal-300 transition-colors duration-200"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </div>
    </form>
  );
}