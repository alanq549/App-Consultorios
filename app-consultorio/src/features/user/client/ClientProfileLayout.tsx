import { ProfileHeader } from "../components/ProfileHeader";
import { SecuritySection } from "../views/SecuritySection";
import { User, Zap } from "lucide-react";

export const ClientProfileLayout = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER PRINCIPAL */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-neutral-900 shadow-2xl shadow-blue-500/5 border border-slate-100 dark:border-neutral-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 p-2">
          <ProfileHeader />
        </div>
      </section>

      {/* CONTENIDO CENTRALIZADO */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* COLUMNA DE SEGURIDAD (Más ancha para llenar el espacio) */}
        <div className="md:col-span-7 lg:col-span-8">
          <SecuritySection />
        </div>

        {/* COLUMNA DE INFORMACIÓN DE CUENTA / TIP (Para que no quede vacío) */}
        <aside className="md:col-span-5 lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
            <Zap className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform" size={120} />
            
            <div className="relative z-10 space-y-4">
              <div className="bg-white/20 w-fit p-2 rounded-xl backdrop-blur-md">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Cuenta de Cliente</h3>
                <p className="text-blue-100 text-xs leading-relaxed">
                  Estás usando una cuenta personal. Puedes agendar citas y gestionar tu historial médico de forma segura.
                </p>
              </div>
              <div className="pt-2">
                <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-full rounded-full" />
                </div>
                <p className="text-[10px] mt-2 text-blue-100 font-medium">Perfil verificado</p>
              </div>
            </div>
          </div>

         
        </aside>

      </div>
    </div>
  );
};