// src/routes/AppRouter.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";
import AuthPage from "@/features/auth/pages/auth";
import VerifyPage from "@/features/auth/pages/VerifyAccount";

// Client
import ClientDashboard from "@/features/Client/pages/ClientDashboard";
import ClientProfile from "@/features/Client/pages/profile";
import ClientAppointments from "@/features/Client/pages/appointments";
import BookingPage from "@/features/Client/components/booking/pages/BookingPage";

// Professional
import ProfessionalDashboard from "@/features/Professional/pages/ProfessionalDashboard";
// import ProfessionalProfile from "@/features/Professional/pages/profile"; // futura ruta
// import ProfessionalAppointments from "@/features/Professional/pages/appointments"; // futura ruta

import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGuard } from "./RoleGuard";

// Layouts
import { ClientLayout } from "@/layouts/ClientLayout";
import { ProfessionalLayout } from "@/layouts/ProfessionalLayout";
import { AppLayout } from "@/layouts/AdminLayout"; // base para app (theme, estilos globales)
// import { AdminLayout } from "@/layouts/AdminLayout"; // futura implementación

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />

      // Rutas públicas
      <Route path="/home" element={<Home />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/verify" element={<VerifyPage />} />

      {/* Layout base (Theme, estilos globales) */}
      <Route element={<AppLayout />}>
        {/* Públicas */}

        {/* Protegidas con tema */}
        <Route element={<ProtectedRoute />}>
          {/* CLIENT */}
          <Route element={<RoleGuard allowed={["CLIENT"]} />}>
            <Route element={<ClientLayout />}>
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/client/profile" element={<ClientProfile />} />
              <Route
                path="/client/appointments"
                element={<ClientAppointments />}
              />
              <Route path="/client/booking" element={<BookingPage />} />
            </Route>
          </Route>

          {/* PROFESSIONAL */}
          <Route element={<RoleGuard allowed={["PROFESSIONAL"]} />}>
            <Route element={<ProfessionalLayout />}>
              <Route
                path="/professional/dashboard"
                element={<ProfessionalDashboard />}
              />
              {/* Rutas futuras del profesional */}
              {/* <Route path="/professional/profile" element={<ProfessionalProfile />} /> */}
              {/* <Route path="/professional/appointments" element={<ProfessionalAppointments />} /> */}
            </Route>
          </Route>

          {/* ADMIN (preparado pero comentado) */}
          {/*
          <Route element={<RoleGuard allowed={["ADMIN"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>
          */}
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
