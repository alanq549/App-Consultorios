import { useUserProfile } from "@/hooks/users/useUserProfile";
import { Modal } from "@/components/ui/Modal";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useAppSelector } from "@/hooks/auth/useRedux";
import { useState } from "react";
import { ShieldCheck, KeyRound, Loader2, CheckCircle, ChevronRight, AlertCircle, Lock } from "lucide-react";

export const ProfilePasswordSection = () => {
  const { changePassword } = useUserProfile();
  const { forgotPassword } = useAuthActions();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const [emailSent, setEmailSent] = useState(false);

  const handleSave = async () => {
    if (!current || !next) return;
    setLoading(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    try {
      await forgotPassword(user.email);
      setEmailSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex justify-between items-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <ShieldCheck size={20} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Contraseña
          </p>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-neutral-400" />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-all"
      >
        Actualizar
        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>

      {open && (
        <Modal title="Seguridad de la Cuenta" onClose={() => setOpen(false)}>
          {emailSent ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={40} />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-white text-xl">¡Enlace enviado!</h4>
                <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-[250px] mx-auto">
                  Revisa tu bandeja de entrada para completar la recuperación.
                </p>
              </div>
              <button
                onClick={() => { setOpen(false); setEmailSent(false); }}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-neutral-800 font-bold text-slate-700 dark:text-neutral-200 hover:bg-slate-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase ml-1">Contraseña Actual</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-400" size={18} />
                    <input
                      type="password"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase ml-1">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading || !current || !next}
                className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all
                cursor-pointer "
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Actualizar Contraseña"}
              </button>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer" 
                >
                  <AlertCircle size={14} />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};