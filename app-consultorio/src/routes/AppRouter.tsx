// src/routes/AppRouter.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";
import AuthPage from "@/features/auth/pages/auth";
import VerifyPage from "@/features/auth/pages/VerifyAccount";
import {ResetPasswordPage} from "@/features/auth/pages/ResetPasswordPage";
import {ForgotPasswordPage} from "@/features/auth/pages/ForgotPassword";

// Client
import ClientDashboard from "@/features/Client/pages/ClientDashboard";
import ClientProfile from "@/features/Client/pages/profile";
import ClientAppointments from "@/features/Client/pages/appointments";
import ClientBookingPage from "@/features/appointment/pages/ClientBookingPage";

// Professional
import ProfessionalDashboard from "@/features/Professional/pages/ProfessionalDashboard";
import ProfessionalProfile from "@/features/Professional/pages/Profile"; 
import ProfessionalAppointments from "@/features/Professional/pages/ProfessionalAppointments";
import ServicesPage from "@/features/services/pages/ServicesPage";
import SchedulesPage from "@/features/schedules/pages/schedulesPages";

import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGuard } from "./RoleGuard";

// Layouts
import { ClientLayout } from "@/layouts/ClientLayout";
import { ProfessionalLayout } from "@/layouts/ProfessionalLayout";
// import { AdminLayout } from "@/layouts/AdminLayout"; // futura implementación
import { AppLayout } from "@/layouts/AdminLayout"; // base para app (theme, estilos globales)

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      {/* Rutas públicas */}
      <Route path="/home" element={<Home />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
              <Route path="/client/booking" element={<ClientBookingPage />} />
            </Route>
          </Route>

          {/* PROFESSIONAL */}
          <Route element={<RoleGuard allowed={["PROFESSIONAL"]} />}>
            <Route element={<ProfessionalLayout />}>
              <Route path="/professional/dashboard" element={<ProfessionalDashboard />}/>
               <Route path="/professional/Services" element={<ServicesPage />} /> 
               <Route path="/professional/schedules" element={<SchedulesPage />} /> 
               <Route path="/professional/profile" element={<ProfessionalProfile />} /> 
               <Route path="/professional/patients" element={<ProfessionalAppointments />} /> 
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
