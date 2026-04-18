// src/features/auth/components/LoginForm.tsx
import { useState } from "react";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function LoginForm() {
  const { login } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    await toast.promise(
      login(email, password),
      {
        loading: "Iniciando sesión...",
        success: "Sesión iniciada",
        error: "Credenciales incorrectas"
      }
    );
  } catch (err) {
    console.error(err);
  } finally {
    setIsLoading(false);
  }
};

  const inputStyles =
    "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400";
  const labelStyles =
    "block text-sm font-semibold text-neutral-700 mb-1";

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 dark:bg-white">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-neutral-900">Bienvenido</h2>
        <p className="text-gray-500 mt-2">Ingresa a tu cuenta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 dark:text-neutral-600">
        <div>
          <label className={labelStyles}>Correo electrónico</label>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyles}
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className={labelStyles}>Contraseña</label>
            <Link
              to="/forgot-password"
              className="text-xs text-indigo-600 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="relative dark:text-neutral-600">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`${inputStyles} pr-12`}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500 hover:text-indigo-600"
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {isLoading ? "Cargando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}
