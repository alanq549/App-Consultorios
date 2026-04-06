import type { Service } from "@/types/service.type";
import { Clock, Edit3 } from "lucide-react";

interface Props {
  service: Service;
  onEdit: () => void;
}

export function ServiceCard({ service, onEdit }: Props) {
  return (
    <div className="group bg-white dark:bg-neutral-900 rounded-[2rem] border border-slate-200 dark:border-neutral-800 p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all relative overflow-hidden">
      {/* DECORACIÓN SUTIL */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
          <Clock size={20} />
        </div>
        <button 
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
          {service.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-neutral-400 line-clamp-2 min-h-[40px]">
          {service.description || "Sin descripción detallada."}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración</span>
          <span className="text-sm font-bold text-slate-700 dark:text-neutral-200">{service.durationMin} min</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Monto</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400">
            ${service.price}
          </span>
        </div>
      </div>
    </div>
  );
}