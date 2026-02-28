import { Outlet } from "react-router-dom";
import Sidebar from "@/features/Admin/components/SidebarProfessional";
import Topbar from "@/features/Admin/components/TopbarProfessional";
import { useAppSelector } from "@/hooks/redux";
import { LayoutType } from "@/types/layout";
import { useSyncTheme } from "@/hooks/useSyncTheme"; 
import "@/styles/layouts/professionalLayout.css";
import DynamicBackground from "@/components/backgrounds/DynamicBackground";

export default function AdminLayout() {
  useSyncTheme();

  const layout: LayoutType = useAppSelector(
    (state) => state.customConfig.data?.layout as LayoutType || LayoutType.SIDEBAR
  );

  // Contenedor de contenido común, tipo glassmorphism
  const ContentWrapper = (
    <div className="content_wrapper">
      <main className="main_content-area">
        <Outlet />
      </main>
    </div>
  );

  return (
    <div className="layout-container">
      <DynamicBackground />

      {layout === LayoutType.TOPBAR ? (
        <div className="topbar-layout">
          <Topbar />
          <div className="topbar-wrapper">
            {ContentWrapper}
          </div>
        </div>
      ) : (
        <div className="sidebar-layout">
          <Sidebar />
          <div className="sidebar-wrapper">
            {ContentWrapper}
          </div>
        </div>
      )}
    </div>
  );
}
