// ARCHIVO: src/app.ts
import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import identityRoutes from "@/modules/identity/http/identity.routes";
import userRoutes from "@/modules/users/users.routes"
import configRoutes from "@/modules/config/config.routes"
import AppointmentRoutes from "@/modules/appointments/appointments.routes" 
import { errorHandler } from "./shared/http/errorHandler";
import professionalProfileRoutes from "./modules/users/professionalprofile/professionalprofile.routes";
import serviceRoutes from "./modules/services/service.routes";
import schedulesRoutes from "./modules/schedule/schedule.routes";
import notificationRoutes from "@/modules/notifications/notifications.routes";
import SpecialtyRoutes  from "./modules/specialty/specialty.routes";
import AdminRoutes from "@/modules/admin/admin.routes"
import  ReviewsRoutes from "@/modules/reviews/reviews.routes" 
import tenancyRoutes from "@/modules/tenancy/http/tenancy.routes";
import path from "path";

import "express-async-errors";

const app = express();

// 🔹 CORS aquí
app.use(cors({
  origin: process.env.FRONTEND_URL, // frontend
  credentials: true,               // si envías cookies
}));

app.use(express.json());

// 🔹 Cabecera de seguridad para prevenir MIME-sniffing
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// Para servir archivos estáticos (imágenes de avatar) con nosniff forzado
const staticOptions = {
  setHeaders: (res: express.Response) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
};
app.use("/img", express.static("public/img", staticOptions));
app.use("/avatars", express.static(path.resolve(__dirname, "../public/img/avatars"), staticOptions));
// Nota (Fase 4 D6): Se retira express.static('/certificates'); la entrega es privada y autenticada.

// Rutas
app.use("/api/auth", identityRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tenancy", tenancyRoutes);
app.use("/api/admin", AdminRoutes);
app.use("/api/specialties", SpecialtyRoutes);
app.use("/api/users", userRoutes); // otros endpoints usan json solo es avatar el que usa multipart/form-data, y multer lo maneja internamente sin afectar a los demás endpoints
app.use("/api/config", configRoutes);
app.use("/api/appointments", AppointmentRoutes)
app.use("/api/professionals", professionalProfileRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", ReviewsRoutes);
// siempre al final:
app.use(errorHandler);


export default app;
