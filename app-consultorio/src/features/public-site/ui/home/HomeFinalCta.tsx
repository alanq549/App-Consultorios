import { Link } from 'react-router-dom';

/**
 * CTA final de la Home pública. Enlaza a rutas reales de registro e información del producto.
 */
export function HomeFinalCta() {
  return (
    <section id="contacto" className="py-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-brand-100 via-white to-cyan-100 dark:from-brand-900/60 dark:via-slate-900 dark:to-cyan-950/60 border border-brand-500/30 p-8 sm:p-14 text-center">
          <div className="absolute inset-0 bg-grid-pattern-light dark:bg-grid-pattern [background-size:40px_40px] opacity-30 pointer-events-none" />
          <h2 className="relative text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Moderniza tu atención médica hoy
          </h2>
          <p className="relative mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Únete a la red líder de salud digital. Ya seas un paciente buscando comodidad o un consultorio
            buscando optimizar su agenda.
          </p>
          <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-brand-500/25 hover:from-brand-400 hover:to-cyan-400 transition transform hover:-translate-y-0.5"
            >
              Agendar consulta ahora
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-semibold text-sm transition"
            >
              Solicitar demo para clínicas →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
