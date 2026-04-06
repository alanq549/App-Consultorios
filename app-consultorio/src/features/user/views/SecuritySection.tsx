import { ProfileEmailSection } from "../components/ProfileEmailEditor";
import { ProfilePasswordSection } from "../components/ProfilePasswordEditor";
import { Shield, Settings } from "lucide-react";

export const SecuritySection = () => {

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 overflow-hidden">

      <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-50 bg-slate-50/50 dark:bg-neutral-800/30 dark:border-neutral-800 mb-2">
        <div className="p-2   rounded-lg text-blue-600">
          <Shield size={18} />
        </div>

        <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          SEGURIDAD
        </h2>
      </div>

      <div className="p-2 space-y-2">
        <ProfileEmailSection />
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-100 dark:via-neutral-800 to-transparent" />
        <ProfilePasswordSection />
      </div>

      <div className="px-6 py-4 mt-2">
        <p className="text-[10px] text-slate-400 dark:text-neutral-500 italic flex items-center gap-1">
          <Settings size={12} />
          Tus datos están encriptados de extremo a extremo.
        </p>
      </div>

    </div>
  );
};