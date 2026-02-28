"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const users_service_1 = require("./users.service");
class UsersController {
    static async me(req, res) {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        const data = await users_service_1.UsersService.me(req.user.id, req.user.role);
        res.json(data);
    }
}
exports.UsersController = UsersController;
