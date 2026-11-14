import { Link } from 'react-router-dom';

type SpecialtyCard = {
  name: string;
  count: string;
  accent: string;
  iconPath: string;
};

// Contenido estático: la Home no consume el catálogo. Los conteos son de referencia comercial.
const SPECIALTIES: SpecialtyCard[] = [
  {
    name: 'Cardiología',
    count: '14 especialistas',
    accent: 'bg-red-500/10 text-red-500 dark:text-red-400',
    iconPath:
      'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  },
  {
    name: 'Pediatría',
    count: '22 especialistas',
    accent: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    iconPath: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    name: 'Dermatología',
    count: '19 especialistas',
    accent: 'bg-teal-500/10 text-teal-500 dark:text-teal-400',
    iconPath:
      'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  },
  {
    name: 'Odontología',
    count: '31 especialistas',
    accent: 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400',
    iconPath:
      'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  },
  {
    name: 'Ginecología',
    count: '16 especialistas',
    accent: 'bg-pink-500/10 text-pink-500 dark:text-pink-400',
    iconPath:
      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    name: 'Medicina General',
    count: '45 médicos disp.',
    accent: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    iconPath:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
];

export function SpecialtiesSection() {
  return (
    <section id="especialidades" className="py-20 border-t border-slate-200 dark:border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">
            Especialidades Médicas
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Encuentra atención para cualquier necesidad de salud
          </h3>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Profesionales certificados con consulta presencial y telemedicina.
          </p>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {SPECIALTIES.map((specialty) => (
            <li key={specialty.name}>
              <Link
                to="/register"
                aria-label={`Agendar consulta de ${specialty.name}`}
                className="group flex flex-col h-full p-5 rounded-2xl bg-white/60 dark:bg-dark-card/60 hover:bg-white dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition-all duration-300 transform hover:-translate-y-1 text-center"
              >
                <div
                  className={`w-12 h-12 mx-auto rounded-xl ${specialty.accent} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d={specialty.iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300">
                  {specialty.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{specialty.count}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
