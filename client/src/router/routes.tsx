// src/router/routes.tsx
import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";
import Login from "../features/auth/pages/AuthPage";
// import Register from "../features/auth/pages/Register";
import VerifyAccount from "../pages/erifyAccount";
import Unauthorized from "../pages/erifyAccount";

// Dashboards por rol
import DashboardAdmin from "../features/Admin/pages/DashboardAdmin";
import AdminLayout from "../layouts/AdminLayout";
import DashboardProfessional from "../features/professionals/pages/Dashboard";
import SpecialtiesList from "../features/Admin/specialties/SpecialtiesList";
import Users from "../features/Admin/pages/users";


///client
import ClientLayout from "@/layouts/ClientLayout"
import DashboardClient from "@/features/Client/pages/Dashboard";
import Schedule from "@/features/Client/pages/schedule";
// import Appointmentsc from "@/features/Client/pages/Appointments";
import MyPerfil from "@/features/Client/pages/MyPerfil";
import MyAppointments from "@/features/Client/pages/MyAppointments";


import ProtectedRoute from "./ProtectedRoute";
import ProfessionalLayout from "../layouts/ProfessionalLayout";
import ProfilePage from "@/features/professionals/pages/Profile";
import ServiceAndSchedules from "@/features/professionals/pages/services&schedules";
import Appointments from "@/features/professionals/pages/Appointments";
import AdminPerfil from "@/features/Admin/pages/Myperfil";

// import { ErrorBoundary } from 'react-error-boundary';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/verify",
    element: <VerifyAccount />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  // {
  //   path: "/login",
  //   element: <Login />,
  // },

// {
//   path: "/register",
//   element: (
//     <ErrorBoundary
//       fallbackRender={({ error, resetErrorBoundary }) => (
//         <div className="p-4">
//           <p className="text-red-600">Ocurrió un error: {error.message}</p>
//           <button
//             onClick={resetErrorBoundary}
//             className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
//           >
//             Reintentar
//           </button>
//         </div>
//       )}
//     >
//       <Register />
//     </ErrorBoundary>
//   ),
// },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  // 👮‍♂️ Rutas protegidas por rol

  {
    path: "/admin",
    element: (
      <ProtectedRoute role="ADMIN">
        <AdminLayout/>
      </ProtectedRoute>
    ),
    children:[
      {
        path:"dashboard",
        element: <DashboardAdmin/>
      },
      {
        path:"users",
        element: <Users/>
      },
      {
        path:"specialties",
        element: <SpecialtiesList/>
      },
      {
        path:"profile",
        element: <AdminPerfil/>
      },
    ]
  },
  {
    path: "/professional",
    element: (
      <ProtectedRoute role="PROFESSIONAL">
        <ProfessionalLayout  />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard", // esto es relativo a "/professional"
        element: <DashboardProfessional />, // tu componente para la vista principal
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "ServiceAndSchedules",
        element: <ServiceAndSchedules />,
      },
      {
        path: "appointments",
        element: <Appointments />,
      },
      {
        path: "appointments",
        element: <Appointments />,
      },
    //   {
    //     path: "settings",
    //     element: <Settings />, // configuración, por ejemplo
    //   },
],
  },

  {
    path: "/client",
    element: (
      <ProtectedRoute role="CLIENT">
        <ClientLayout />
      </ProtectedRoute>
    ),
    children:[
      {
        path: "dashboard",
        element: <DashboardClient/>,
      },
      {
        path: "schedule",
        element: <Schedule/>,
      },
      {
        path: "appointments",
        element: <MyAppointments/>,
      },
      {
        path: "Myperfil",
        element: <MyPerfil/>,
      },
    ],
  },

  // Ruta 404
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
