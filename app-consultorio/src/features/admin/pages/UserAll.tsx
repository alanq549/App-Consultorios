import { useState } from "react";
import { PendingProfessionals } from "../components/PendingProfessionals";
import { ApprovedProfessionals } from "../components/ApprovedProfessionals";
import { AllProfessionals } from "../components/AllProfessionals";
import { Users, Clock, ShieldCheck } from "lucide-react";

export default function UserAll() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending");

  const tabs = [
    { id: "pending", label: "Pendientes", icon: Clock, color: "text-amber-500" },
    { id: "approved", label: "Aprobados", icon: ShieldCheck, color: "text-emerald-500" },
    { id: "all", label: "Todos", icon: Users, color: "text-blue-500" },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER ESTRATÉGICO */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2">Administración</p>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Gestión de Usuarios</h1>
        </div>

        {/* SELECTOR DE TABS TIPO GLASS */}
        <div className="flex p-1.5 bg-slate-200/50 dark:bg-black/20 backdrop-blur-md rounded-[2rem] border border-white/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
                  isActive 
                    ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xl scale-105" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-neutral-300"
                }`}
              >
                <Icon size={14} className={isActive ? tab.color : "opacity-50"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTENEDOR DE LISTAS */}
      <main className="bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl rounded-[3rem] border border-white/40 dark:border-white/10 p-8 min-h-[500px]">
        {activeTab === "pending" && <PendingProfessionals />}
        {activeTab === "approved" && <ApprovedProfessionals />}
        {activeTab === "all" && <AllProfessionals />}
      </main>
    </div>
  );
}