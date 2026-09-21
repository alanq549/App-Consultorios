"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const users_service_1 = require("./users.service");
const users_dto_1 = require("./users.dto");
const clientprofile_dto_1 = require("./clientprofile/clientprofile.dto");
const professionalprofile_dto_1 = require("./professionalprofile/professionalprofile.dto");
/* import { UpdateAdminProfileSchema } from "./adminprofile/adminprofile.dto"; */
class UsersController {
    ///
    static async me(req, res) {
        const data = await users_service_1.UsersService.me(req.user.id, req.user.role);
        res.json(data);
    }
    static async changeEmail(req, res) {
        const { email, password } = users_dto_1.ChangeEmailDTO.parse(req.body);
        ///ahora son 3 argumentos no ?
        const result = await users_service_1.UsersService.changeEmail(req.user.id, email, password);
        res.json(result);
    }
    static async changePassword(req, res) {
        const { currentPassword, newPassword } = users_dto_1.ChangePasswordDTO.parse(req.body);
        const result = await users_service_1.UsersService.changePassword(req.user.id, currentPassword, newPassword);
        res.json(result);
    }
    static async updateAvatar(req, res) {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const avatarPath = `/avatars/${req.file.filename}`;
        const updated = await users_service_1.UsersService.updateAvatar(req.user.id, req.user.role, avatarPath);
        res.json({ avatar: updated.avatar });
    }
    static async updateProfile(req, res) {
        let data;
        switch (req.user.role) {
            case "CLIENT":
                data = clientprofile_dto_1.UpdateClientProfileSchema.parse(req.body);
                break;
            case "PROFESSIONAL":
                data = professionalprofile_dto_1.UpdateProfessionalProfileSchema.parse(req.body);
                break;
            /*  case "ADMIN":
            data = UpdateAdminProfileSchema.parse(req.body);
            break;
       */
            default:
                throw new Error("Rol no soportado");
        }
        const profile = await users_service_1.UsersService.updateProfile(req.user.id, req.user.role, data);
        res.json(profile);
    }
}
exports.UsersController = UsersController;
