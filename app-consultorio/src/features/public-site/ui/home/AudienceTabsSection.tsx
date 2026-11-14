import { useState } from 'react';

type AudienceTab = 'pacientes' | 'clinicas';

type BenefitCard = {
  title: string;
  description: string;
  accent: string;
  iconPath: string;
};

const PATIENT_BENEFITS: BenefitCard[] = [
  {
    title: 'Cero tiempo en fila',
    description:
      'Reserva tu espacio en tiempo real, monitorea el turno en directo desde tu teléfono y llega justo cuando te van a atender.',
    accent: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Historial digital portátil',
    description:
      'Tus recetas, estudios y diagnósticos disponibles 24/7 en tu portal seguro. Comparte con cualquier médico con un código QR temporal.',
    accent: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    title: 'Recordatorios vía WhatsApp',
    description:
      'Confirmaciones automáticas, indicaciones previas para estudios y enlace directo a Google Maps para llegar a la sucursal sin perderte.',
    accent: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
];

const CLINIC_BENEFITS: BenefitCard[] = [
  {
    title: 'Arquitectura Multisede',
    description:
      'Controla 1 o 50 consultorios desde un solo panel. Permisos granulares para recepcionistas, médicos y administradores contables.',
    accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    iconPath:
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    title: 'Reducción del 75% en Inasistencias',
    description:
      'El agente de IA confirma asistencias automáticamente 24 horas antes, reasignando cupos cancelados al instante a pacientes en lista de espera.',
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    title: 'Normativa Oficial y Facturación',
    description:
      'Plantillas de notas clínicas con apego a NOM-004 del expediente clínico y timbrado de facturas SAT automatizado al recibir pagos.',
    accent: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
    iconPath:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
];

function BenefitGrid({ cards }: { cards: BenefitCard[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {cards.map((card) => (
        <div
          key={card.title}
          className="p-8 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 transition"
        >
          <div className={`w-12 h-12 rounded-xl ${card.accent} flex items-center justify-center mb-6`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d={card.iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{card.title}</h4>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{card.description}</p>
        </div>
      ))}
    </div>
  );
}

export function AudienceTabsSection() {
  const [activeTab, setActiveTab] = useState<AudienceTab>('pacientes');

  return (
    <section id="clinicas" className="py-20 bg-slate-100/70 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">
            Plataforma Todo-en-Uno
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Diseñado tanto para pacientes como para directores médicos
          </h3>

          <div className="mt-8 inline-flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" role="tablist">
            <button
              type="button"
              role="tab"
              id="tab-pacientes"
              aria-selected={activeTab === 'pacientes'}
              aria-controls="panel-pacientes"
              onClick={() => setActiveTab('pacientes')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'pacientes'
                  ? 'text-white bg-brand-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Para Pacientes
            </button>
            <button
              type="button"
              role="tab"
              id="tab-clinicas"
              aria-selected={activeTab === 'clinicas'}
              aria-controls="panel-clinicas"
              onClick={() => setActiveTab('clinicas')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'clinicas'
                  ? 'text-white bg-brand-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Para Clínicas &amp; Especialistas
            </button>
          </div>
        </div>

        {activeTab === 'pacientes' ? (
          <div id="panel-pacientes" role="tabpanel" aria-labelledby="tab-pacientes">
            <BenefitGrid cards={PATIENT_BENEFITS} />
          </div>
        ) : (
          <div id="panel-clinicas" role="tabpanel" aria-labelledby="tab-clinicas">
            <BenefitGrid cards={CLINIC_BENEFITS} />
          </div>
        )}
      </div>
    </section>
  );
}
