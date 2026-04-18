// src/features/auth/pages/VerifyPage.tsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAppDispatch } from "@/hooks/auth/useRedux";
import { setCredentials, setMe } from "@/store/auth/authSlice";
import { authApi } from "@/api/auth.api";
import { usersApi } from "@/api/users.api";
import { setConfig } from "@/store/config/configSlice";
import { useAuthRedirect } from "@/hooks/auth/useAuthRedirect";
import { Loader2, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useAuthRedirect();

  useEffect(() => {
    const verifyAccount = async () => {
      const token = params.get("token");
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        const { data } = await authApi.verify(token);
        dispatch(setCredentials(data));

        const me = await usersApi.me();
        dispatch(setMe(me));

        if (me.config) {
          dispatch(setConfig(me.config));
        }
        
        setStatus("success");
      } catch (err) {
        console.error("Error verificando la cuenta:", err);
        setStatus("error");
      }
    };

    verifyAccount();
  }, [params, dispatch]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4 relative overflow-hidden">
      {/* Fondo decorativo dinámico */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] transition-colors duration-1000 ${
          status === 'verifying' ? 'bg-blue-500/10' : 
          status === 'success' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
        }`} />
      </div>

      <div className="max-w-md w-full">
        <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl border border-white dark:border-white/10 p-12 rounded-[3rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] text-center relative overflow-hidden">
          
          {/* ESTADO: VERIFICANDO */}
          {status === "verifying" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative inline-flex">
                <Loader2 size={48} className="text-blue-600 animate-spin" strokeWidth={1.5} />
                <div className="absolute inset-0 blur-xl bg-blue-500/30 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  Verificando acceso
                </h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  Estableciendo conexión segura
                </p>
              </div>
            </div>
          )}

          {/* ESTADO: ÉXITO */}
          {status === "success" && (
            <div className="space-y-6 animate-in scale-in-95 fade-in duration-500">
              <div className="inline-flex p-5 bg-emerald-500 rounded-[2rem] text-white shadow-2xl shadow-emerald-500/40">
                <ShieldCheck size={40} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  ¡Cuenta validada!
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
                  Tu identidad ha sido confirmada con éxito.
                </p>
              </div>
              <div className="pt-4">
                <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest animate-bounce">
                  Redirigiendo...
                </div>
              </div>
            </div>
          )}

          {/* ESTADO: ERROR */}
          {status === "error" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex p-5 bg-rose-500/10 rounded-[2rem] text-rose-500">
                <AlertCircle size={40} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  Enlace inválido
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
                  El token ha expirado o ya ha sido utilizado anteriormente.
                </p>
              </div>
              <Link
                to="/auth/auth"
                className="group w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                Ir al login
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}

        </div>
        
      
      </div>
    </div>
  );
}