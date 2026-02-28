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

import "express-async-errors";


const app = express();
app.use("/img", express.static("public/img"));

app.use(express.json()); // 👈 ESTE ES EL PUTO CLAVE 🔑

// 🔹 CORS aquí
app.use(cors({
  origin: "http://localhost:5173", // frontend
  credentials: true,               // si envías cookies
}));


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/config", configRoutes);
app.use("/api/appointments", AppointmentRoutes)
app.use("/api/professionals", professionalProfileRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/notifications", notificationRoutes);

// siempre al final:
app.use(errorHandler);

export default app;
