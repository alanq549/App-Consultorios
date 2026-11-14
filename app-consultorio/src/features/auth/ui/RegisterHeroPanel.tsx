// src/features/auth/ui/RegisterHeroPanel.tsx
import { Building2, Check, ShieldCheck } from "lucide-react";

/**
 * Panel derecho decorativo (estático) del registro.
 * Sólo visible en `lg+`; reproduce el hero de beneficios del diseño.
 */
export function RegisterHeroPanel() {
  return (
    <aside className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-10 xl:p-16 text-white overflow-hidden bg-gradient-to-br from-teal-950 via-[#071d22] to-[#060b13]">
      {/* Cuadrícula y brillos decorativos */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div aria-hidden="true" className="absolute -top-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute -bottom-24 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Encabezado del panel */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-teal-300 border border-white/10 mb-6 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Plataforma Cloud 100% Médica</span>
        </div>
        <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
          Una sola cuenta, toda tu operación clínica centralizada.
        </h2>
        <p className="mt-3 text-slate-300 text-sm xl:text-base leading-relaxed max-w-lg">
          Diseñado para brindar la máxima agilidad tanto a pacientes
          independientes como a consultorios y centros médicos
          multidisciplinarios.
        </p>
      </div>

      {/* Tarjetas de beneficios */}
      <div className="relative z-10 space-y-4 my-8">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30 group-hover:scale-110 transition-transform">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Para Pacientes</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Agenda citas 24/7 sin llamadas telefónicas. Accede a tus recetas
                electrónicas, historial de consultas y recordatorios automatizados.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-white">Para Médicos y Clínicas</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-400/30">
                  Multitenant
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Crea tu consultorio independiente o red médica. Invita a tu equipo
                con permisos RBAC y aislamiento estricto de expedientes.
              </p>
            </div>
          </div>
        </div>

        {/* Micro-mockup */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-teal-900/40 to-slate-900/50 border border-teal-500/30 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-sm">
                CC
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Consultorio Activo: Clínica Central</p>
              <p className="text-[11px] text-teal-300">Dr. Alejandro Morales • Pediatría</p>
            </div>
          </div>
          <span className="text-xs font-medium bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40">
            Disponible hoy
          </span>
        </div>
      </div>

      {/* Badges regulatorios */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            Norma Oficial Mexicana <strong>NOM-004-SSA3-2012</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Cifrado AES-256 bits</span>
          <span>•</span>
          <span>HIPAA Compliant</span>
        </div>
      </div>
    </aside>
  );
}
