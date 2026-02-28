"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const users_routes_1 = __importDefault(require("@/modules/users/users.routes"));
const config_routes_1 = __importDefault(require("@/modules/config/config.routes"));
const appointments_routes_1 = __importDefault(require("@/modules/appointments/appointments.routes"));
const errorHandler_1 = require("./core/errors/errorHandler");
const professionalprofile_routes_1 = __importDefault(require("./modules/users/professionalprofile/professionalprofile.routes"));
const service_routes_1 = __importDefault(require("./modules/services/service.routes"));
const schedule_routes_1 = __importDefault(require("./modules/schedule/schedule.routes"));
require("express-async-errors");
const app = (0, express_1.default)();
app.use("/img", express_1.default.static("public/img"));
app.use(express_1.default.json()); // 👈 ESTE ES EL PUTO CLAVE 🔑
// 🔹 CORS aquí
app.use((0, cors_1.default)({
    origin: "http://localhost:5173", // frontend
    credentials: true, // si envías cookies
}));
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", users_routes_1.default);
app.use("/api/config", config_routes_1.default);
app.use("/api/appointments", appointments_routes_1.default);
app.use("/api/professionals", professionalprofile_routes_1.default);
app.use("/api/services", service_routes_1.default);
app.use("/api/schedules", schedule_routes_1.default);
// siempre al final:
app.use(errorHandler_1.errorHandler);
exports.default = app;
