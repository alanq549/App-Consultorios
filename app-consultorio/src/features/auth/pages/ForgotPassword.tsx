import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useState } from "react";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ── ESTADO: CORREO ENVIADO ──────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4 animate-in fade-in duration-500">
        <div className="max-w-md w-full bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl border border-white dark:border-white/10 p-10 rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] text-center">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 mb-6">
            <CheckCircle2 size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-3">
            Revisa tu bandeja
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 leading-relaxed mb-8">
            Si <span className="font-bold text-slate-700 dark:text-slate-200">{email}</span> está registrado, recibirás un enlace para restablecer tu acceso en unos minutos.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={3} /> Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // ── ESTADO: FORMULARIO ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4 relative overflow-hidden">
      {/* Decoración de fondo sutil */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-md w-full animate-in zoom-in-95 duration-500">
        <form 
          onSubmit={handleSubmit} 
          className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white dark:border-white/10 p-10 rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] space-y-6"
        >
          {/* Header del Formulario */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-600/10 rounded-2xl text-blue-600 mb-2">
              <Mail size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              ¿Olvidaste tu clave?
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Recuperar acceso
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                Correo Electrónico
              </label>
              <input
                required
                type="email"
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-black/20 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-black/40 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 dark:text-white outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              {loading ? (
                <span className="animate-pulse">Enviando...</span>
              ) : (
                <>
                  <Send size={14} strokeWidth={3} />
                  Enviar enlace
                </>
              )}
            </button>
          </div>

          <div className="pt-4 text-center">
            <Link
              to="/auth"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft size={12} strokeWidth={3} /> Regresar al login
            </Link>
          </div>
        </form>
        
        <p className="text-center mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Protección de cuenta &copy; 2026
        </p>
      </div>
    </div>
  );
};