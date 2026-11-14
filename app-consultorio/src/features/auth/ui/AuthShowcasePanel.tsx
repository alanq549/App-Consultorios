// src/features/auth/ui/AuthShowcasePanel.tsx
import { Check, Quote, Zap } from "lucide-react";

const TRUST_ITEMS = [
  "Aislamiento por Consultorio",
  "Control de Roles RBAC",
  "Auditoría en tiempo real",
];

const VITALS = [
  { label: "Presión Arterial", value: "118/76", unit: "mmHg", tag: "Normal" },
  { label: "Temperatura", value: "36.6", unit: "°C", tag: "Afebril" },
  { label: "Alergias", value: "Ninguna", unit: "", tag: "Verificado" },
];

/**
 * Panel derecho decorativo (estático) del marco de autenticación.
 * Sólo visible en `lg+`; reproduce el showcase clínico del diseño.
 */
export function AuthShowcasePanel() {
  return (
    <aside
      className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 text-white overflow-hidden bg-[#061c1d]"
      style={{
        backgroundImage:
          "radial-gradient(at 0% 0%, hsla(168,76%,18%,0.8) 0px, transparent 50%)," +
          "radial-gradient(at 100% 100%, hsla(215,68%,12%,1) 0px, transparent 65%)," +
          "radial-gradient(at 80% 20%, hsla(174,82%,15%,0.5) 0px, transparent 50%)",
      }}
    >
      {/* Cuadrícula decorativa */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Orbes difuminados */}
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Badges superiores */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-teal-500/30 text-xs font-semibold text-teal-300">
          <Zap className="w-3.5 h-3.5 animate-pulse" />
          <span>Gestión Clínica Multitenant 2.0</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sistemas Operativos 99.99%</span>
        </div>
      </div>

      {/* Tarjeta central: sala de espera en vivo */}
      <div className="relative z-10 my-auto py-8">
        <div className="rounded-2xl p-6 shadow-2xl max-w-lg bg-white/5 backdrop-blur-xl border border-teal-500/20 transform hover:-translate-y-1 transition duration-300">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                  Siguiente paciente en sala
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                María Fernanda López
              </h2>
              <span className="text-xs text-slate-300 font-medium">
                Motivo: Consulta de Seguimiento Post-Op
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono font-bold text-sm border border-teal-500/30">
                10:30 AM
              </span>
              <span className="text-[11px] text-emerald-400 mt-1 font-medium">
                Llegada a tiempo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-5">
            {VITALS.map((vital) => (
              <div key={vital.label} className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[11px] uppercase font-semibold text-slate-400 block mb-1">
                  {vital.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">{vital.value}</span>
                  {vital.unit && (
                    <span className="text-[10px] text-teal-400 font-medium">{vital.unit}</span>
                  )}
                </div>
                <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded">
                  {vital.tag}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Consultorio 3 • Dr. Alejandro Silva
            </span>
            <span className="text-teal-300 font-semibold">Abrir Expediente →</span>
          </div>
        </div>

        {/* Testimonio */}
        <div className="mt-8 max-w-lg">
          <Quote className="w-8 h-8 text-teal-500/50 mb-3" />
          <blockquote className="text-lg xl:text-xl font-medium text-slate-100 leading-snug">
            “Pasamos de llevar agendas en papel a gestionar 3 sucursales y 14
            especialistas sin cruzar un solo expediente.”
          </blockquote>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-400 to-cyan-500 flex items-center justify-center font-bold text-[#07161b] text-xs">
              VM
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Dra. Valeria Mendoza</p>
              <p className="text-xs text-teal-300/80">Directora Médica en Clínica Santa Fe</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="relative z-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-300">
        {TRUST_ITEMS.map((item) => (
          <div key={item} className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
