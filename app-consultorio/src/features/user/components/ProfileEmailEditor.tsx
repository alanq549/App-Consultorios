import { useState } from "react";
import { useSelector } from "react-redux";
import { Modal } from "@/components/ui/Modal";
import { useUserProfile } from "@/hooks/users/useUserProfile";
import type { RootState } from "@/store";
import { Mail, Lock, Loader2, ChevronRight } from "lucide-react";

export const ProfileEmailSection = () => {
  const { changeEmail } = useUserProfile();
  const email = useSelector((state: RootState) => state.auth.user?.email);

  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await changeEmail(password, newEmail);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="flex justify-between items-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <Mail size={20} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">
            Correo electrónico
          </p>
          <p className="text-slate-500 dark:text-neutral-400 font-semibold">
            {email}
          </p>
        </div>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-all"
      >
        Cambiar
        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>

      {open && (
        <Modal title="Actualizar Correo" onClose={() => setOpen(false)}>
          <div className="space-y-6 pt-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase ml-1">Nuevo Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="nuevo@correo.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase ml-1">Confirmar con Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Tu contraseña actual"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading || !newEmail || !password}
              className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Guardar Cambios"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};