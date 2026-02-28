"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
/// src/modules/users/users.service.ts
const prisma_1 = __importDefault(require("@/core/prisma"));
const client_1 = require("@prisma/client");
class UsersService {
    static async me(userId, role) {
        const base = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: { customConfig: true },
        });
        if (!base)
            throw new Error("Usuario no existe");
        if (!base.customConfig) {
            throw new Error("CustomConfig no inicializada");
        }
        const config = {
            language: base.customConfig.language,
            theme: base.customConfig.theme,
            layout: base.customConfig.layout,
            notificationsEnabled: base.customConfig.notificationsEnabled,
        };
        if (role === client_1.Role.CLIENT) {
            const profile = await prisma_1.default.clientProfile.findUnique({
                where: { userId },
                include: {
                    _count: { select: { appointments: true } },
                },
            });
            return {
                role,
                profile,
                config,
            };
        }
        if (role === client_1.Role.PROFESSIONAL) {
            const profile = await prisma_1.default.professionalProfile.findUnique({
                where: { userId },
                include: { specialty: true },
            });
            if (!profile)
                throw new Error("Perfil no existe");
            const { id, name, lastName, phone, avatar, description, isVerified, specialty, } = profile;
            return {
                role,
                profile: {
                    id,
                    name,
                    lastName,
                    phone,
                    avatar,
                    description,
                    isVerified,
                    specialty: {
                        id: specialty.id,
                        name: specialty.name,
                        description: specialty.description,
                    },
                },
                config,
            };
        }
        if (role === client_1.Role.ADMIN) {
            const profile = await prisma_1.default.adminProfile.findUnique({
                where: { userId },
            });
            return {
                role,
                profile,
                config,
            };
        }
    }
}
exports.UsersService = UsersService;
