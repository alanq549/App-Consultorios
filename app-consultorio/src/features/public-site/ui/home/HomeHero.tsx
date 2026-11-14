import { useNavigate } from 'react-router-dom';

/**
 * Hero de la Home pública: mensaje principal, widget de búsqueda rápida y sellos de confianza.
 * Contenido estático; el widget navega al flujo real de reserva.
 */
export function HomeHero() {
  const navigate = useNavigate();

  return (
    <section id="inicio" className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden">
      {/* Fondo: rejilla + resplandores ambientales */}
      <div className="absolute inset-0 bg-grid-pattern-light dark:bg-grid-pattern [background-size:40px_40px] pointer-events-none opacity-40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-brand-500/15 rounded-full blur-[140px] pointer-events-none animate-ambient-glow" />
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge de confianza */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-300 text-xs sm:text-sm font-medium mb-8 backdrop-blur-md shadow-sm">
          <span className="w-2 h-2 rounded-full bg-brand-500 dark:bg-brand-400 animate-ping" />
          <span>Red de Consultorios y Especialistas Certificados</span>
          <span className="hidden sm:inline text-brand-500/50 dark:text-brand-400/50">•</span>
          <span className="hidden sm:inline text-brand-700 dark:text-brand-200">
            +40 Clínicas y 180+ Doctores
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.12]">
          Tu salud en manos de especialistas,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-teal-500 to-cyan-500 dark:from-brand-400 dark:via-teal-300 dark:to-cyan-400">
            sin filas ni esperas.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
          Agenda consultas presenciales o digitales en segundos, recibe tu expediente clínico digital y
          gestiona tu consultorio médico desde una sola plataforma unificada.
        </p>

        {/* Widget de búsqueda rápida */}
        <div className="mt-10 max-w-4xl mx-auto">
          <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-2xl p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xl shadow-slate-900/10 dark:shadow-black/60">
            <form
              className="grid grid-cols-1 md:grid-cols-12 gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                navigate('/register');
              }}
            >
              <div className="md:col-span-5 relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  aria-label="Especialidad o médico"
                  placeholder="Especialidad o médico (ej. Cardiología, Pediatría)"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
              </div>

              <div className="md:col-span-4 relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <path
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <select
                  aria-label="Sede o ciudad"
                  defaultValue="all"
                  className="w-full pl-11 pr-8 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  <option value="all">Todas las sedes y ciudades</option>
                  <option value="cdmx">Sede Central - CDMX</option>
                  <option value="gdl">Sede Providencia - Guadalajara</option>
                  <option value="mty">Sede Valle Oriente - Monterrey</option>
                  <option value="online">Telemedicina (En Línea)</option>
                </select>
                <div className="absolute right-3.5 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="w-full h-full min-h-[48px] bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <span>Buscar disponibilidad</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sellos de confianza */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                clipRule="evenodd"
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              />
            </svg>
            <span>Expedientes 100% cifrados (HIPAA)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>Confirmación inmediata por WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span>+40 consultorios y clínicas afiliadas</span>
          </div>
        </div>
      </div>
    </section>
  );
}
