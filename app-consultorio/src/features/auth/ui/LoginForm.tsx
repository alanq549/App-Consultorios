// src/features/auth/ui/LoginForm.tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

type LoginFormProps = {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
};

/**
 * UI del formulario de login. Recibe estado y callbacks por props;
 * la lógica de sesión vive en `useLogin`.
 */
export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  // Selector de rol: sólo visual, el backend determina el rol real.
  const [activeRole, setActiveRole] = useState<"staff" | "patient">("staff");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  const roleTabs = [
    { id: "staff", label: "Médico / Admin", emoji: "🩺" },
    { id: "patient", label: "Paciente", emoji: "👤" },
  ] as const;

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-7">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60 mb-3.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-teal-400" />
          <span>Acceso Seguro a Portal Clínico</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
          Ingresa tus credenciales para acceder a tu consultorio o historial médico.
        </p>
      </div>

      {/* Selector de rol (visual) */}
      <div
        role="tablist"
        aria-label="Seleccionar perfil de acceso"
        className="mb-6 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center border border-slate-200/80 dark:border-slate-800"
      >
        {roleTabs.map((tab) => {
          const isActive = activeRole === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveRole(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="text-base">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Correo Electrónico
          </label>
          <div className="relative rounded-xl shadow-sm">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Contraseña
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand-600 dark:text-teal-400 hover:text-brand-700 dark:hover:text-teal-300 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative rounded-xl shadow-sm">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full pl-11 pr-24 py-3 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-900 cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="ml-2.5 block text-xs sm:text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              Mantener sesión iniciada (30 días)
            </label>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl px-3 py-2"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-5 mt-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 via-teal-600 to-emerald-600 hover:from-brand-700 hover:via-teal-700 hover:to-emerald-700 active:scale-[0.99] shadow-lg shadow-teal-700/20 dark:shadow-teal-950/40 transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span>{isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}</span>
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      {/* Divisor */}
      <div className="relative my-6">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white dark:bg-slate-950 text-slate-400 uppercase font-medium tracking-wider">
            o continúa con
          </span>
        </div>
      </div>

      {/* Proveedores (placeholder visual) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <span>Google</span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>SSO Clínico</span>
        </button>
      </div>

      {/* Enlace a registro */}
      <p className="mt-6 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        ¿Aún no tienes cuenta?{" "}
        <Link to="/register" className="font-bold text-brand-600 dark:text-teal-400 hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}
