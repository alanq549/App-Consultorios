/**
 * Vista previa del producto: mockup estático del panel clínico.
 * No consume API; reproduce el contenido de referencia del diseño.
 */
export function PlatformPreviewSection() {
  return (
    <section id="demo" className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-24">
      <div className="relative rounded-2xl p-1.5 sm:p-2 bg-gradient-to-b from-brand-500/30 via-slate-300/40 dark:via-slate-700/30 to-transparent shadow-2xl">
        {/* Ventana de aplicación */}
        <div className="rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-inner">
          {/* Barra de ventana */}
          <div className="bg-slate-100 dark:bg-slate-900/90 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-3 font-mono">
                consultorioapp.com/dashboard/clinica-del-valle
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> En vivo
              </span>
            </div>
          </div>

          {/* Contenido del panel */}
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 dark:bg-slate-950/70">
            {/* Columna izquierda: métricas y turnos */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Citas para hoy</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    18 <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 ml-1">+4 vs ayer</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-brand-500 h-full w-[78%]" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">En Sala de Espera</div>
                  <div className="text-2xl font-bold text-teal-600 dark:text-teal-300 mt-1">
                    3 <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">pacientes</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                    <span className="text-amber-600 dark:text-amber-400">⏱ 6 min</span> tiempo promedio
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tasa de Asistencia</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">96.4%</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">WhatsApp Bot activo</div>
                </div>
              </div>

              {/* Tabla de próximos turnos */}
              <div className="bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800/90 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    Turnos en tiempo real - Hoy
                  </h3>
                  <span className="text-xs text-brand-600 dark:text-brand-400">Ver agenda completa →</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs">
                        MR
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">Mateo Reyes (34a)</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Cardiología • Dra. Valeria Mendoza</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        En consulta
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">10:30 AM</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
                        AL
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">Ana Lucía Morales</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Pediatría • Dr. Roberto Castro</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        En sala de espera
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">11:00 AM</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                        SG
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">Sofía Gómez Ramos</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Dermatología • Dra. Patricia Vega</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                        Confirmada WA
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">11:30 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: expediente y acciones */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 rounded-xl border border-brand-500/30 p-5 shadow-lg relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-brand-500/10 rounded-full blur-xl" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Expediente Activo
                  </span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    ID: #MED-8921
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Mateo Reyes</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Alergias: Penicilina • Tipo: O+</p>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Presión arterial:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">120/80 mmHg</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Glucosa capilar:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">92 mg/dL</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Última visita:</span>
                    <span className="text-slate-500 dark:text-slate-400">Hace 3 meses</span>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition text-center shadow"
                  >
                    Generar Receta QR
                  </button>
                  <button
                    type="button"
                    aria-label="Añadir nota al expediente"
                    className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">Sala Telemedicina</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">1 enlace pendiente para enviar</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">Iniciar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
