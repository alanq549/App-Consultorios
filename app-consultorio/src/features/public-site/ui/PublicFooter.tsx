const FOOTER_COLUMNS = [
  {
    title: 'Para Pacientes',
    links: ['Buscar Especialistas', 'Portal del Paciente', 'Telemedicina', 'Preguntas Frecuentes'],
  },
  {
    title: 'Para Clínicas',
    links: ['Software de Gestión', 'Expediente Clínico NOM-004', 'WhatsApp Notificador', 'Precios & Planes'],
  },
  {
    title: 'Seguridad',
    links: ['Aviso de Privacidad', 'Cumplimiento HIPAA', 'Términos de Servicio', 'Contacto & Soporte'],
  },
];

const LEGAL_LINKS = ['Seguridad Cifrada 256-bit', 'Privacidad Médica', 'Soporte 24/7'];

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Marca */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                  <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                  <circle cx="20" cy="10" r="2" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Consultorio<span className="text-brand-600 dark:text-brand-400 font-black">App</span>
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed mb-4">
              Infraestructura cloud para clínicas privadas, centros médicos y especialistas independientes.
              Menos esperas, más salud.
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> Sistemas 99.99%
                operativos
              </span>
            </div>
          </div>

          {/* Columnas de enlaces */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                {column.title}
              </h4>
              <ul className="space-y-2.5 text-xs">
                {column.links.map((link) => (
                  <li key={link}>
                    <a className="hover:text-slate-900 dark:hover:text-white transition" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div>© {year} ConsultorioApp Inc. Todos los derechos reservados.</div>
          <div className="mt-4 sm:mt-0 flex gap-6">
            {LEGAL_LINKS.map((link) => (
              <a key={link} className="hover:text-slate-700 dark:hover:text-slate-400 transition" href="#">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
