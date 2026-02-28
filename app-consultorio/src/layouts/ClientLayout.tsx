// layouts/ClientLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { useAppSelector } from "@/hooks/auth/useRedux";

export const ClientLayout = () => {
  const user = useAppSelector((s) => s.auth.user);
  const config = useAppSelector((s) => s.config.config);

  if (!user || !config) return <div>Cargando layout...</div>;

  if (config.layout === "TOPBAR") {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar isStandalone />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CLIENT" />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

