import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useState } from "react";
import {  Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export const ResetPasswordPage = () => {
  const [search] = useSearchParams();
  const token = search.get("token");
  const navigate = useNavigate();
  const { resetPassword } = useAuthActions();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── ESTADO: TOKEN INVÁLIDO ──────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md w-full bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl border border-rose-500/20 p-10 rounded-[2.5rem] shadow-xl text-center">
          <div className="inline-flex p-4 bg-rose-500/10 rounded-2xl text-rose-500 mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Enlace inválido</h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mb-8">El token de seguridad ha expirado o es incorrecto.</p>
          <Link to="/auth/forgot-password"  className="text-[11px] font-black uppercase tracking-widest text-blue-600 hover:underline">Solicitar nuevo enlace</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(token, password);
      // Redirigir con éxito (puedes añadir un state para mostrar un mensaje en el login)
      navigate("/auth/login?reset=success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />
      
      <div className="max-w-md w-full animate-in zoom-in-95 duration-500">
        <form 
          onSubmit={handleSubmit}
          className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white dark:border-white/10 p-10 rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30 mb-2">
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Nueva contraseña</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Establece tu nuevo acceso</p>
          </div>

          <div className="space-y-6">
            {/* Input Group */}
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                Contraseña de seguridad
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-100/50 dark:bg-black/20 border ${error ? 'border-rose-500/50' : 'border-transparent'} focus:border-blue-500/50 focus:bg-white dark:focus:bg-black/40 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 dark:text-white outline-none transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Password Strength Indicator (Visual) */}
              <div className="flex gap-1.5 px-1 pt-1">
                {[1, 2, 3, 4].map((step) => (
                  <div 
                    key={step} 
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                      password.length >= step * 2 ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/5'
                    }`} 
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake duration-300">
                <AlertCircle size={14} className="text-rose-500 shrink-0" />
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 leading-tight">{error}</p>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  Restablecer contraseña
                  <ArrowRight size={16} strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Conexión segura cifrada de punto a punto
        </p>
      </div>
    </div>
  );
};