"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const config_routes_1 = __importDefault(require("./modules/config/config.routes"));
const appointments_routes_1 = __importDefault(require("./modules/appointments/appointments.routes"));
const errorHandler_1 = require("./core/errors/errorHandler");
const professionalprofile_routes_1 = __importDefault(require("./modules/users/professionalprofile/professionalprofile.routes"));
const service_routes_1 = __importDefault(require("./modules/services/service.routes"));
const schedule_routes_1 = __importDefault(require("./modules/schedule/schedule.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const specialty_routes_1 = __importDefault(require("./modules/specialty/specialty.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const reviews_routes_1 = __importDefault(require("./modules/reviews/reviews.routes"));
const path_1 = __importDefault(require("path"));
require("express-async-errors");
const app = (0, express_1.default)();
// 🔹 CORS aquí
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL, // frontend
    credentials: true, // si envías cookies
}));
app.use(express_1.default.json());
// Para servir archivos estaticos (como imagenes de avatar y certificados)
app.use("/img", express_1.default.static("public/img"));
app.use("/avatars", express_1.default.static(path_1.default.resolve(__dirname, "../public/img/avatars")));
app.use("/certificates", express_1.default.static("public/certificates"));
// Rutas
app.use("/api/auth", auth_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/specialties", specialty_routes_1.default);
app.use("/api/users", users_routes_1.default); // otros endpoints usan json solo es avatar el que usa multipart/form-data, y multer lo maneja internamente sin afectar a los demás endpoints
app.use("/api/config", config_routes_1.default);
app.use("/api/appointments", appointments_routes_1.default);
app.use("/api/professionals", professionalprofile_routes_1.default);
app.use("/api/services", service_routes_1.default);
app.use("/api/schedules", schedule_routes_1.default);
app.use("/api/notifications", notifications_routes_1.default);
app.use("/api/reviews", reviews_routes_1.default);
// siempre al final:
app.use(errorHandler_1.errorHandler);
exports.default = app;
