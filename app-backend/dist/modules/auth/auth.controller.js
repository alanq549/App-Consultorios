"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./auth.dto");
const AppError_1 = require("@/core/errors/AppError");
class AuthController {
    static async register(req, res, next) {
        try {
            const data = await auth_dto_1.RegisterDTO.parseAsync(req.body);
            const user = await auth_service_1.AuthService.register(data);
            res.status(201).json(user);
        }
        catch (err) {
            next(err); // 👈 esto manda el error a tu errorHandler
        }
    }
    static async login(req, res, next) {
        try {
            const data = await auth_dto_1.LoginDTO.parseAsync(req.body);
            const result = await auth_service_1.AuthService.login(data.email, data.password);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async verifyByToken(req, res, next) {
        try {
            const { token } = req.query;
            if (!token || typeof token !== "string") {
                throw new AppError_1.AppError("Token requerido", 400);
            }
            const result = await auth_service_1.AuthService.verifyByToken(token);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                throw new AppError_1.AppError("Refresh token requerido", 400);
            }
            const result = await auth_service_1.AuthService.refresh(refreshToken);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async forgotPassword(req, res, next) {
        try {
            const data = await auth_dto_1.ForgotPasswordDTO.parseAsync(req.body);
            await auth_service_1.AuthService.forgotPassword(data.email);
            res.json({ message: "Si existe el usuario, se envió el correo" });
        }
        catch (err) {
            next(err);
        }
    }
    static async resetPassword(req, res, next) {
        try {
            const data = await auth_dto_1.ResetPasswordDTO.parseAsync(req.body);
            await auth_service_1.AuthService.resetPassword(data.token, data.newPassword);
            res.json({ message: "Password actualizada" });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
