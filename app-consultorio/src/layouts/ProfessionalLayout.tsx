// layouts/ProfessionalLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { useAppSelector } from "@/hooks/auth/useRedux";

export const ProfessionalLayout = () => {
  const user = useAppSelector((s) => s.auth.user);
  const config = useAppSelector((s) => s.config.config);

  if (!user || !config) return <div>Cargando layout profesional...</div>;

  // Variante solo topbar
  if (config.layout === "TOPBAR") {
    return (
      <div className="flex flex-col min-h-screen ">
        <Topbar isStandalone />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Variante sidebar + topbar
  return (
    <div className="flex min-h-screen ">
      <Sidebar role="PROFESSIONAL" />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 p-8 overflow-auto">
          {/* Aquí podrías añadir un panel lateral extra si quieres */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};