import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, FileText, Timer } from "lucide-react";

export const VerificationPending = () => {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 animate-in fade-in zoom-in-95 duration-700">
      {/* CARD PRINCIPAL */}
      <div className="relative max-w-xl w-full mt-12">
        
        {/* DECORACIÓN DE FONDO (GRADIENTE SUTIL) */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -z-10" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -z-10" />

        <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl rounded-[3rem] p-10 md:p-14 border border-white/60 dark:border-white/10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] text-center">
          
          {/* ICONO CENTRAL ANIMADO */}
          <div className="relative inline-flex mb-8">
            <div className="absolute inset-0 bg-blue-500/20 rounded-[2rem] blur-xl animate-pulse" />
            <div className="relative bg-white dark:bg-neutral-800 p-6 rounded-[2rem] border border-white dark:border-white/10 shadow-xl">
              <ShieldCheck size={48} strokeWidth={1.5} className="text-blue-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 p-2 rounded-xl text-white shadow-lg shadow-amber-500/40">
              <Timer size={16} strokeWidth={3} />
            </div>
          </div>

          {/* TEXTOS */}
          <div className="space-y-4 mb-10">
            <div>
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.4em] mb-2">
                Estatus de Verificación
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                Casi listo para <br /> empezar.
              </h2>
            </div>
            
            <p className="text-sm font-medium text-slate-500 dark:text-neutral-400 leading-relaxed max-w-[320px] mx-auto">
              Tu perfil profesional está en <span className="text-slate-800 dark:text-white font-black">revisión técnica</span>. 
              Subir tus certificados ayuda a nuestro equipo a validar tu cuenta más rápido.
            </p>
          </div>

          {/* ACCIÓN PRINCIPAL */}
          <div className="flex flex-col gap-3">
            <Link
              to="/professional/profile"
              className="group flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] transition-all shadow-xl shadow-slate-900/20 active:scale-95"
            >
              <FileText size={18} strokeWidth={2.5} />
              Completar Expediente
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
              Tiempo estimado de respuesta: <span className="text-blue-500">24-48 horas</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};