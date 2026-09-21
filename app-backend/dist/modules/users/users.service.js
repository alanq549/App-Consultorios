"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
// src/modules/users/users.service.ts
const prisma_1 = __importDefault(require("../../core/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const clientprofile_service_1 = require("./clientprofile/clientprofile.service");
const professionalprofile_service_1 = require("./professionalprofile/professionalprofile.service");
const adminprofile_service_1 = require("./adminprofile/adminprofile.service");
const config_service_1 = require("../config/config.service");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Map de rol -> servicio de perfil
const profileServiceMap = {
    CLIENT: clientprofile_service_1.ClientProfileService,
    PROFESSIONAL: professionalprofile_service_1.ProfessionalProfileService,
    ADMIN: adminprofile_service_1.AdminProfileService,
};
class UsersService {
    static async me(userId, role) {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            throw new Error("Usuario no existe");
        const config = await config_service_1.ConfigService.getByUser(userId);
        const service = profileServiceMap[role];
        if (!service)
            throw new Error("Rol no soportado");
        const profile = await service.me(userId);
        return {
            role,
            email: user.email,
            isVerified: user.isVerified,
            profile,
            config,
        };
    }
    ///cambio de correo
    static async changeEmail(userId, currentPassword, newEmail) {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            throw new Error("Usuario no existe");
        const valid = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!valid) {
            throw new Error("Contraseña incorrecta");
        }
        const exists = await prisma_1.default.user.findUnique({
            where: { email: newEmail },
        });
        if (exists) {
            throw new Error("El correo ya está en uso");
        }
        const updated = await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                email: newEmail,
                isVerified: false,
            },
        });
        return {
            email: updated.email,
            isVerified: updated.isVerified,
        };
    }
    // cambio de password:
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            throw new Error("Usuario no existe");
        const valid = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!valid) {
            throw new Error("Contraseña actual incorrecta");
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.$transaction([
            prisma_1.default.user.update({
                where: { id: userId },
                data: { password: hashed },
            }),
            prisma_1.default.refreshToken.updateMany({
                where: { userId },
                data: { isRevoked: true },
            }),
        ]);
        return { message: "Contraseña actualizada" };
    }
    // cambio de avatar
    static async updateAvatar(userId, role, newAvatar) {
        const service = profileServiceMap[role];
        if (!service)
            throw new Error("Rol no soportado");
        const currentProfile = await service.findByUserId(userId);
        const oldAvatar = currentProfile?.avatar;
        // borrar primero
        if (oldAvatar && oldAvatar !== newAvatar) {
            const fileName = path_1.default.basename(oldAvatar);
            const oldPath = path_1.default.join(process.cwd(), "public", "img", "avatars", fileName);
            try {
                if (fs_1.default.existsSync(oldPath)) {
                    fs_1.default.unlinkSync(oldPath);
                    console.log("Avatar eliminado:", oldPath);
                }
            }
            catch (err) {
                console.error("Error eliminando avatar:", err);
            }
        }
        await service.updateProfile(userId, {
            avatar: newAvatar,
        });
        return { avatar: newAvatar };
    }
    static async updateProfile(userId, role, data) {
        const service = profileServiceMap[role];
        if (!service)
            throw new Error("Rol no soportado");
        return service.updateProfile(userId, data);
    }
}
exports.UsersService = UsersService;
