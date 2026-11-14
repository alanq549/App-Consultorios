// src/routes/AppRouter.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/features/public-site/pages/HomePage";
import NotFound from "../pages/NotFound";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
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

//admin
import AdminDashboard from "@/features/admin/pages/AdminDashboard";
import UserAll from "@/features/admin/pages/UserAll";
import AdminProfile from "@/features/admin/pages/Profile";
import SpecialtiesPage from "@/features/admin/pages/SpecialtiesPage";

import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGuard } from "./RoleGuard";
import { ProfessionalVerificationGuard } from "./guards/ProfessionalVerificationGuard";

// Layouts
import { ClientLayout } from "@/layouts/ClientLayout";
import { ProfessionalLayout } from "@/layouts/ProfessionalLayout";
import  { AdminLayout } from "@/layouts/AdminLayout"; // futura implementación
import { AppLayout } from "@/layouts/AppLayout"; // base para app (theme, estilos globales)


export default function AppRouter() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
            <Route element={<ProfessionalVerificationGuard />}>

            <Route element={<ProfessionalLayout />}>
              <Route path="/professional/dashboard" element={<ProfessionalDashboard />}/>
               <Route path="/professional/Services" element={<ServicesPage />} /> 
               <Route path="/professional/schedules" element={<SchedulesPage />} /> 
               <Route path="/professional/profile" element={<ProfessionalProfile />} /> 
               <Route path="/professional/patients" element={<ProfessionalAppointments />} /> 
            </Route>
            </Route>
          </Route>

          {/* ADMIN (preparado pero comentado) */}
          
          <Route element={<RoleGuard allowed={["ADMIN"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserAll />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/Specialties" element={< SpecialtiesPage/>} />
            </Route>
          </Route>
         
        </Route>
      </Route>
      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
