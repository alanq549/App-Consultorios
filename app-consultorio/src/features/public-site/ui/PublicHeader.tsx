import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicTheme } from '@/hooks/theme/usePublicTheme';

const NAV_LINKS = [
  { label: 'Especialidades', href: '#especialidades' },
  { label: 'Para Clínicas', href: '#clinicas' },
  { label: 'Plataforma', href: '#demo' },
  { label: 'Seguridad & HIPAA', href: '#seguridad' },
  { label: 'Contacto', href: '#contacto' },
];

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Tema local de la superficie pública, compartido y persistido con Login/Registro.
  const { isDark, toggleTheme } = usePublicTheme();

  return (
    <>
      {/* AnnouncementBar */}
      <div className="bg-gradient-to-r from-brand-50 via-cyan-50 to-brand-50 dark:from-brand-900/40 dark:via-cyan-900/30 dark:to-brand-900/40 border-b border-brand-500/20 py-2 px-4 text-center text-xs md:text-sm text-brand-800 dark:text-brand-300 font-medium flex items-center justify-center gap-2">
        <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-700 dark:text-brand-400 font-semibold border border-brand-500/20">
          Nuevo
        </span>
        <span>Soporte Multitenant y Telemedicina integrada en ConsultorioApp 2.0</span>
        <a className="underline hover:text-brand-950 dark:hover:text-white transition-colors ml-1 font-semibold" href="#clinicas">
          Conoce más →
        </a>
      </div>

      {/* MainHeader */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 dark:bg-dark-bg/85 border-b border-slate-200 dark:border-slate-200/10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link className="flex items-center gap-2.5 group" to="/">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                <circle cx="20" cy="10" r="2" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Consultorio
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-500 dark:from-brand-400 dark:to-cyan-400 font-black">
                App
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            {NAV_LINKS.map((link) => (
              <a key={link.href} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Alternar tema claro/oscuro"
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    clipRule="evenodd"
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white px-4 py-2 transition-colors"
            >
              Iniciar sesión
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 transition-all duration-200"
            >
              <span>Agendar cita</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Abrir menú"
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300"
            >
              ☰
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-4 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-bg">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
            <Link onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-semibold text-brand-500" to="/login">
              Iniciar sesión
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
