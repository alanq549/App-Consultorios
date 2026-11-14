const STATS = [
  { value: '+50,000', label: 'Consultas Gestionadas', accent: 'text-brand-600 dark:text-brand-400' },
  { value: '99.8%', label: 'Puntualidad en Citas', accent: 'text-slate-900 dark:text-white' },
  { value: '40+', label: 'Clínicas Conectadas', accent: 'text-cyan-600 dark:text-cyan-400' },
  { value: '0 seg', label: 'Tiempos de Espera Inútiles', accent: 'text-slate-900 dark:text-white' },
];

/**
 * Prueba social y seguridad: testimonio destacado y métricas de referencia.
 * Contenido estático de marketing.
 */
export function SocialProofSection() {
  return (
    <section id="seguridad" className="py-20 border-t border-slate-200 dark:border-slate-800/80 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-xl relative">
          <div className="text-brand-500/20 absolute top-6 right-8 pointer-events-none">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-8.983z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 mb-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <svg key={index} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-xs text-slate-600 dark:text-slate-300 ml-2 font-semibold">
                4.9 / 5.0 en satisfacción
              </span>
            </div>
            <blockquote className="text-xl sm:text-2xl font-medium text-slate-800 dark:text-slate-100 leading-snug">
              "Pasamos de libretas y llamadas constantes a gestionar 3 sucursales y 14 especialistas sin
              cruzar un solo expediente. La puntualidad de los pacientes aumentó de inmediato gracias al bot
              de confirmación."
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-500/30 border border-brand-400/50 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold">
                VM
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 dark:text-white">Dra. Valeria Mendoza</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Directora Médica en Centro Médico Metropolitano
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className={`text-3xl sm:text-4xl font-black ${stat.accent}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
