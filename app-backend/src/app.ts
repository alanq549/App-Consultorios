import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "@/modules/users/users.routes"
import configRoutes from "@/modules/config/config.routes"
import AppointmentRoutes from "@/modules/appointments/appointments.routes" 
import { errorHandler } from "./core/errors/errorHandler";
import professionalProfileRoutes from "./modules/users/professionalprofile/professionalprofile.routes";
import serviceRoutes from "./modules/services/service.routes";
import schedulesRoutes from "./modules/schedule/schedule.routes";
import notificationRoutes from "@/modules/notifications/notifications.routes";
import SpecialtyRoutes  from "./modules/specialty/specialty.routes";
import AdminRoutes from "@/modules/admin/admin.routes"
import path from "path";

import "express-async-errors";

const app = express();

// 🔹 CORS aquí
app.use(cors({
  origin: "http://localhost:5173", // frontend
  credentials: true,               // si envías cookies
}));

app.use(express.json());
// Para servir archivos estaticos (como imagenes de avatar y certificados)
app.use("/img", express.static("public/img"));
app.use("/avatars", express.static(path.resolve(__dirname, "../public/img/avatars")));
app.use("/certificates", express.static("public/certificates"));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/admin", AdminRoutes);
app.use("/api/specialties", SpecialtyRoutes);
app.use("/api/users", userRoutes); // otros endpoints usan json solo es avatar el que usa multipart/form-data, y multer lo maneja internamente sin afectar a los demás endpoints
app.use("/api/config", configRoutes);
app.use("/api/appointments", AppointmentRoutes)
app.use("/api/professionals", professionalProfileRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/notifications", notificationRoutes);

// siempre al final:
app.use(errorHandler);

export default app;
