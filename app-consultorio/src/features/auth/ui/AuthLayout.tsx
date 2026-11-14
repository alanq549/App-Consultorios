// src/features/auth/ui/AuthLayout.tsx
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, ShieldCheck, Stethoscope, Sun } from "lucide-react";
import { AuthShowcasePanel } from "./AuthShowcasePanel";
import { usePublicTheme } from "@/hooks/theme/usePublicTheme";

type AuthLayoutProps = {
  children: ReactNode;
  /** Acción a la derecha del header. Por defecto: "Volver al inicio". */
  headerAction?: ReactNode;
  /** Panel derecho. Por defecto: showcase clínico del login. */
  aside?: ReactNode;
  /** Pie del panel izquierdo. Por defecto: nota de seguridad. */
  footer?: ReactNode;
};

/**
 * Marco visual compartido por Login y Registro.
 * Panel izquierdo (formulario + controles) y panel derecho (showcase).
 */
export function AuthLayout({ children, headerAction, aside, footer }: AuthLayoutProps) {
  const { isDark, toggleTheme } = usePublicTheme();

  const defaultHeaderAction = (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-teal-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">Volver al inicio</span>
    </Link>
  );

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <section className="flex-1 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-24 bg-white dark:bg-slate-950 transition-colors duration-200 z-10">
        <header className="flex items-center justify-between w-full max-w-xl mx-auto mb-8">
          <Link to="/" title="ConsultorioApp Inicio" className="inline-flex items-center gap-2.5 group">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-teal-500 to-cyan-400 p-[2px] shadow-sm group-hover:scale-105 transition-transform duration-200">
              <span className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </span>
            </span>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Consultorio<span className="text-brand-600 dark:text-teal-400">App</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {headerAction ?? defaultHeaderAction}
            <button
              type="button"
              aria-label="Cambiar tema de color"
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="w-full max-w-md mx-auto my-auto py-4">{children}</div>

        {footer ?? (
          <footer className="pt-6 border-t border-slate-100 dark:border-slate-900/60 max-w-xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cumplimiento HIPAA &amp; NOM-004</span>
            </div>
            <span>Expedientes cifrados de extremo a extremo (AES-256)</span>
          </footer>
        )}
      </section>

      {aside ?? <AuthShowcasePanel />}
    </main>
  );
}
