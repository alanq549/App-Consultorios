// 📄 ClientLayout.jsx (Mejorado con ContentWrapper)
import { Outlet } from "react-router-dom";
import Sidebar from "@/features/Client/components/SidebarClient";
import Topbar from "@/features/Client/components/TopbarClient";
import { useAppSelector } from "@/hooks/redux";
import { LayoutType } from "@/types/layout";
import { useSyncTheme } from "@/hooks/useSyncTheme";
import "@/styles/layouts/ClientLayout.css";
import DynamicBackground from "@/components/backgrounds/DynamicBackground";

export default function ClientLayout() {
  useSyncTheme();

  const layout: LayoutType = useAppSelector(
    (state) => state.customConfig.data?.layout as LayoutType || LayoutType.SIDEBAR
  );

  // Contenedor de contenido común para ambos layouts, aplica el estilo flotante
  const ContentWrapper = (
    <div className="content_wrapper "> {/* Aplica Glassmorphism/Flotante */}

      <main className="main_content-area"> {/* Aplica Padding interno */}
        <Outlet />
      </main>
    </div>
  );

  return (
    <div className="client_layout-container">
                      <DynamicBackground />

      {layout === LayoutType.TOPBAR ? (
        <div className="client_topbar-layout">
          <Topbar />
          <div className="client_topbar-area"> {/* Área principal para el panel en Topbar */}
            {ContentWrapper}
          </div>
        </div>
      ) : (
        <div className="client_sidebar-layout">
          <Sidebar />
          <div className="client_sidebar-area"> {/* Área principal para el panel en Sidebar */}
            {ContentWrapper}
          </div>
        </div>
      )}
    </div>
  );
}